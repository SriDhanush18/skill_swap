/**
 * SkillSwap Platform - REST API Client & Auth/JWT State Manager
 * Connects to Express + Supabase Auth Bridge + SQLite with full JWT token injection
 */

class SkillSwapStore {
  constructor() {
    this.apiBase = '/api';
    this.storageKey = 'skillswap_vignan_store_v2';
    this.tokenKey = 'skillswap_auth_token';
    this.token = localStorage.getItem(this.tokenKey) || null;
    this.currentPersonaId = localStorage.getItem('skillswap_active_persona') || 'sri';
    this.currentUser = null;
    this.personas = DEFAULT_PERSONAS;
    this.quizzes = [];
    this.sessions = [];
    this.transactions = [];
    this.notifications = [];
    this.chats = {};
  }

  getAuthHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    headers['x-user-id'] = this.currentPersonaId;
    return headers;
  }

  async init() {
    try {
      if (this.token) {
        const isValid = await this.fetchMe();
        if (!isValid || !this.currentUser) {
          this.setToken(null);
        }
      }

      await this.fetchUsers();
      await this.fetchQuizzes();
      await this.fetchSessions();
      await this.fetchWallet();
    } catch (e) {
      console.warn('API fetch warning, using local state:', e);
    }
  }

  // ==========================================
  // Authentication & Session Management
  // ==========================================
  async register({ email, password, name, college, major, role, bio }) {
    const res = await fetch(`${this.apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, college, major, role, bio })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Registration failed');

    this.setToken(data.token);
    this.currentUser = data.user;
    this.currentPersonaId = data.user.id;
    this.personas[data.user.id] = {
      ...(this.personas[data.user.id] || {}),
      ...data.user
    };
    localStorage.setItem('skillswap_active_persona', data.user.id);
    sessionStorage.setItem('skillswap_logged_in', 'true');
    await this.fetchUsers();
    await this.fetchWallet();
    await this.fetchSessions();
    return data;
  }

  async login(emailOrId, password) {
    const isEmail = emailOrId.includes('@');
    const payload = isEmail ? { email: emailOrId, password } : { userId: emailOrId, password };

    const res = await fetch(`${this.apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Login failed');

    this.setToken(data.token);
    this.currentUser = data.user;
    this.currentPersonaId = data.user.id;
    this.personas[data.user.id] = {
      ...(this.personas[data.user.id] || {}),
      ...data.user
    };
    localStorage.setItem('skillswap_active_persona', data.user.id);
    sessionStorage.setItem('skillswap_logged_in', 'true');
    await this.fetchUsers();
    await this.fetchWallet();
    await this.fetchSessions();
    return data;
  }

  async autoLoginPersona(personaId) {
    try {
      const email = personaId.includes('@') ? personaId : (personaId === 'admin' ? 'skrao@vignan.ac.in' : `${personaId}@vignan.ac.in`);
      const res = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Password123', userId: personaId })
      });
      const data = await res.json();
      if (data.success && data.token) {
        this.setToken(data.token);
        this.currentUser = data.user;
        this.currentPersonaId = data.user.id;
        this.personas[data.user.id] = {
          ...(this.personas[data.user.id] || {}),
          ...data.user
        };
      }
    } catch (e) {
      console.warn('Auto-login persona note:', e.message);
    }
  }

  async fetchMe() {
    try {
      const res = await fetch(`${this.apiBase}/auth/me`, {
        headers: this.getAuthHeaders()
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        this.currentPersonaId = data.user.id;
        this.personas[data.user.id] = {
          ...(this.personas[data.user.id] || {}),
          ...data.user
        };
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Could not verify session:', e.message);
      return false;
    }
  }

  async fetchLoginHistory() {
    try {
      const res = await fetch(`${this.apiBase}/auth/login-history`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.logins) {
        return data.logins;
      }
    } catch (e) {
      console.warn('Could not fetch login history:', e.message);
    }
    return [];
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  logout() {
    this.setToken(null);
    this.currentUser = null;
    this.currentPersonaId = null;
    localStorage.removeItem('skillswap_active_persona');
    sessionStorage.removeItem('skillswap_logged_in');
  }

  isSessionActive() {
    return sessionStorage.getItem('skillswap_logged_in') === 'true';
  }

  getCurrentPersona() {
    if (this.currentUser) {
      const personaObj = this.personas[this.currentUser.id] || {};
      const isAdm = this.currentUser.role === 'ADMIN' || this.currentUser.is_admin === 1 || personaObj.isAdmin || false;
      const full = {
        ...personaObj,
        ...this.currentUser,
        role: this.currentUser.role || (isAdm ? 'ADMIN' : 'STUDENT'),
        isAdmin: isAdm
      };
      full.id = this.currentUser.id || personaObj.id || this.currentPersonaId;
      full.name = this.currentUser.name || personaObj.name || 'User';
      full.email = this.currentUser.email || personaObj.email || (full.id + '@vignan.ac.in');
      full.major = this.currentUser.major || personaObj.major || 'Vignan Student';
      full.college = this.currentUser.college || personaObj.college || 'Vignan University';
      full.bio = this.currentUser.bio || personaObj.bio || `Student at ${full.college}`;
      full.credits = this.currentUser.credits !== undefined ? Number(this.currentUser.credits) : (Number(personaObj.credits) || 0);
      full.skillsOffered = this.currentUser.skillsOffered || this.currentUser.skills_offered || personaObj.skillsOffered || [];
      full.skillsWanted = this.currentUser.skillsWanted || this.currentUser.skills_wanted || personaObj.skillsWanted || [];
      full.certificates = this.currentUser.certificates || personaObj.certificates || [];
      full.badges = this.currentUser.badges || personaObj.badges || (typeof this.currentUser.badges_json === 'string' ? JSON.parse(this.currentUser.badges_json) : ['Vignan Member', full.role]);
      return full;
    }
    const persona = this.personas[this.currentPersonaId] || this.personas['sri'] || DEFAULT_PERSONAS.sri;
    return { ...persona, role: persona.role || (persona.isAdmin ? 'ADMIN' : 'STUDENT') };
  }

  getUserRole() {
    const cur = this.getCurrentPersona();
    return cur.role || (cur.isAdmin ? 'ADMIN' : 'STUDENT');
  }

  isFacultyAdmin() {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'FACULTY_ADMIN' || role === 'SUPER_ADMIN' || this.getCurrentPersona()?.isAdmin;
  }

  async switchPersona(personaId) {
    this.currentPersonaId = personaId;
    localStorage.setItem('skillswap_active_persona', personaId);
    sessionStorage.setItem('skillswap_logged_in', 'true');
    await this.autoLoginPersona(personaId);
    await this.fetchUsers();
    await this.fetchWallet();
    await this.fetchSessions();
    return this.getCurrentPersona();
  }

  async updateUserProfile(userData) {
    const targetId = userData.id || this.currentPersonaId;
    const res = await fetch(`${this.apiBase}/users/${targetId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update user details in database');

    this.currentUser = data.user;
    if (this.personas[targetId]) {
      this.personas[targetId] = {
        ...this.personas[targetId],
        ...data.user,
        escrowLocked: data.user.escrow_locked,
        lifetimeEarned: data.user.lifetime_earned,
        lifetimeSpent: data.user.lifetime_spent,
        reviewsCount: data.user.reviews_count
      };
    }
    await this.fetchUsers();
    return data;
  }

  // ==========================================
  // Protected Resource API Calls
  // ==========================================
  async fetchUsers() {
    try {
      const res = await fetch(`${this.apiBase}/users`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.users) {
        data.users.forEach(u => {
          this.personas[u.id] = {
            ...(this.personas[u.id] || {}),
            ...u,
            name: u.name || this.personas[u.id]?.name || u.id,
            major: u.major || this.personas[u.id]?.major || 'Vignan Student',
            college: u.college || this.personas[u.id]?.college || 'Vignan University',
            bio: u.bio || this.personas[u.id]?.bio || 'Vignan University peer learning enthusiast.',
            skillsOffered: u.skillsOffered || this.personas[u.id]?.skillsOffered || [],
            skillsWanted: u.skillsWanted || this.personas[u.id]?.skillsWanted || [],
            certificates: u.certificates || this.personas[u.id]?.certificates || [],
            escrowLocked: u.escrow_locked || 0.0,
            lifetimeEarned: u.lifetime_earned || 0.0,
            lifetimeSpent: u.lifetime_spent || 0.0,
            reviewsCount: u.reviews_count || 0
          };
        });
      }
    } catch (e) {
      console.warn('Backend offline, using seed personas', e);
    }
    if (this.currentUser && this.currentUser.id) {
      this.personas[this.currentUser.id] = {
        ...(this.personas[this.currentUser.id] || {}),
        ...this.currentUser
      };
    }
    return this.personas;
  }

  async getMatchesForCurrentPersona() {
    const current = this.getCurrentPersona();
    const otherPersonas = Object.values(this.personas).filter(p => p && p.id !== current?.id && !p.isAdmin && !p.is_admin);
    const results = [];

    otherPersonas.forEach(peer => {
      const canTeachMe = (peer.skillsOffered || []).filter(so =>
        (current?.skillsWanted || []).some(sw =>
          (so.name || '').toLowerCase().includes((sw.name || '').toLowerCase()) ||
          (sw.name || '').toLowerCase().includes((so.name || '').toLowerCase()) ||
          ((so.category && sw.category) && so.category.toLowerCase() === sw.category.toLowerCase())
        )
      );

      const canLearnFromMe = (peer.skillsWanted || []).filter(sw =>
        (current?.skillsOffered || []).some(so =>
          (so.name || '').toLowerCase().includes((sw.name || '').toLowerCase()) ||
          (sw.name || '').toLowerCase().includes((so.name || '').toLowerCase()) ||
          ((so.category && sw.category) && so.category.toLowerCase() === sw.category.toLowerCase())
        )
      );

      const isTwoWay = canTeachMe.length > 0 && canLearnFromMe.length > 0;
      let matchScore = isTwoWay ? 98 : canTeachMe.length > 0 ? 88 : 72;

      results.push({
        peer,
        isTwoWay,
        matchScore,
        canTeachMe,
        canLearnFromMe
      });
    });

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  async fetchQuizzes() {
    try {
      const res = await fetch(`${this.apiBase}/quizzes`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        this.quizzes = data.quizzes;
      }
    } catch (e) {
      console.warn('Could not load quizzes from API', e);
    }
    return this.quizzes;
  }

  async fetchQuizDetails(skillName) {
    const res = await fetch(`${this.apiBase}/quizzes/${encodeURIComponent(skillName)}`, {
      headers: this.getAuthHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch quiz');
    return data.quiz;
  }

  async submitQuiz(quizId, answers, skillName = '') {
    const res = await fetch(`${this.apiBase}/quizzes/submit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId: this.currentPersonaId,
        quizId,
        skillName,
        answers
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Submission failed');
    await this.fetchUsers();
    await this.fetchWallet();
    return data;
  }

  async fetchQuizAttempts(userId = this.currentPersonaId) {
    try {
      const res = await fetch(`${this.apiBase}/quizzes/attempts/${userId}`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.attempts) {
        return data.attempts;
      }
    } catch (e) {
      console.warn('Could not fetch quiz attempts from API', e);
    }
    return [];
  }

  async bookSession({ teacherId, skillName, hours, date, time, topic }) {
    const res = await fetch(`${this.apiBase}/sessions/book`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        learnerId: this.currentPersonaId,
        tutorId: teacherId,
        skillName,
        durationHours: hours,
        sessionDate: date,
        time,
        topic
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Booking failed');
    await this.fetchUsers();
    await this.fetchSessions();
    await this.fetchWallet();
    return data;
  }

  async completeSessionAndReleaseEscrow(sessionId, rating, comment, tags) {
    const res = await fetch(`${this.apiBase}/sessions/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        sessionId,
        rating,
        comment,
        tags
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Completion failed');
    await this.fetchUsers();
    await this.fetchSessions();
    await this.fetchWallet();
    return data;
  }

  async createGroupCohort({ skillName, topic, hours, date, time, maxCapacity }) {
    const res = await fetch(`${this.apiBase}/sessions/create-cohort`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        skillName,
        topic,
        durationHours: hours,
        sessionDate: date,
        time,
        maxCapacity
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create group live masterclass');
    await this.fetchSessions();
    return data;
  }

  async enrollInCohort(sessionId) {
    const res = await fetch(`${this.apiBase}/sessions/enroll`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sessionId })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Enrollment failed');
    await this.fetchUsers();
    await this.fetchSessions();
    await this.fetchWallet();
    return data;
  }

  async fetchCohortAttendees(sessionId) {
    try {
      const res = await fetch(`${this.apiBase}/sessions/${sessionId}/attendees`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.attendees) {
        return data.attendees;
      }
    } catch (e) {
      console.warn('Could not fetch cohort attendees', e);
    }
    return [];
  }

  async completeCohortSession(sessionId, rating = 5, comment = '', tags = []) {
    const res = await fetch(`${this.apiBase}/sessions/${sessionId}/complete-cohort`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rating, comment, tags })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Cohort completion failed');
    await this.fetchUsers();
    await this.fetchSessions();
    await this.fetchWallet();
    return data;
  }

  async fetchLiveMeeting(sessionId) {
    const res = await fetch(`${this.apiBase}/sessions/${sessionId}/live-meeting`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to authenticate or initialize live meeting');
    return data;
  }

  async endLiveMeeting(sessionId) {
    try {
      const res = await fetch(`${this.apiBase}/sessions/${sessionId}/end-meeting`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (e) {
      console.warn('Could not end live meeting:', e.message);
    }
  }

  async fetchSessions() {
    try {
      const res = await fetch(`${this.apiBase}/sessions`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.sessions) {
        this.sessions = data.sessions;
      }
    } catch (e) {
      console.warn('Could not fetch sessions from API', e);
    }
    return this.sessions;
  }

  async fetchWallet() {
    try {
      const res = await fetch(`${this.apiBase}/wallet/balance`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.wallet) {
        const cur = this.getCurrentPersona();
        cur.credits = data.wallet.availableCredits;
        cur.escrowLocked = data.wallet.escrowLocked;
        cur.lifetimeEarned = data.wallet.lifetimeEarned;
        cur.lifetimeSpent = data.wallet.lifetimeSpent;
      }
      
      const txRes = await fetch(`${this.apiBase}/wallet/transactions`, {
        headers: this.getAuthHeaders()
      });
      const txData = await txRes.json();
      if (txData.success && txData.transactions) {
        this.transactions = txData.transactions;
        const cur = this.getCurrentPersona();
        cur.transactions = txData.transactions;
      }
    } catch (e) {
      console.warn('Could not fetch wallet from API', e);
      const cur = this.getCurrentPersona();
      if (cur && cur.transactions) {
        this.transactions = cur.transactions;
      }
    }
  }

  async fetchTransactionsByUser(userId) {
    try {
      const res = await fetch(`${this.apiBase}/transactions/${userId}`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.transactions) {
        if (this.personas[userId]) {
          this.personas[userId].transactions = data.transactions;
        }
        return data.transactions;
      }
    } catch (e) {
      console.warn(`Could not fetch transactions for user ${userId}`, e);
    }

    if (this.personas[userId] && this.personas[userId].transactions) {
      return this.personas[userId].transactions;
    }
    return (this.transactions || []).filter(tx => tx.user_id === userId);
  }

  async fetchChatMessages(peerId) {
    try {
      const res = await fetch(`${this.apiBase}/chats/messages?peerId=${peerId}`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.messages) {
        return data.messages;
      }
    } catch (e) {
      console.warn('Could not fetch chat messages', e);
    }
    return [];
  }

  async sendMessage(receiverId, text) {
    const res = await fetch(`${this.apiBase}/chats/send`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        receiverId,
        text
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to send message');
    return data;
  }

  async addSkillOffered(skill) {
    const res = await fetch(`${this.apiBase}/skills/offered`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId: this.currentPersonaId,
        ...skill
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add skill');
    await this.fetchUsers();
    await this.fetchWallet();
    return data;
  }

  async addSkillWanted(skill) {
    const res = await fetch(`${this.apiBase}/skills/wanted`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId: this.currentPersonaId,
        ...skill
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to add skill');
    await this.fetchUsers();
    return data;
  }

  async uploadCertificate(certData) {
    const res = await fetch(`${this.apiBase}/certificates/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        userId: this.currentPersonaId,
        ...certData
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Certificate upload failed');
    await this.fetchUsers();
    await this.fetchWallet();
    return data;
  }

  async transferCredits(recipientId, amount, note = '') {
    const res = await fetch(`${this.apiBase}/wallet/transfer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        recipientId,
        amount: Number(amount),
        note
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Transfer failed');
    await this.fetchUsers();
    await this.fetchWallet();
    return data;
  }

  // ==========================================
  // Support Team & Shared Doubt Classification Methods
  // ==========================================
  async fetchSupportStats() {
    try {
      const res = await fetch(`${this.apiBase}/support/stats`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && data.stats) {
        return data.stats;
      }
    } catch (e) {
      console.warn('Could not fetch support stats:', e.message);
    }
    return { openDoubts: 0, inProgressDoubts: 0, resolvedDoubts: 0, totalRewardsCredits: 0 };
  }

  async fetchSupportDoubts(filter = {}) {
    try {
      const query = new URLSearchParams(filter).toString();
      const res = await fetch(`${this.apiBase}/support/doubts?${query}`, {
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (data.success && (data.doubts || data.tickets)) {
        return data.doubts || data.tickets;
      }
    } catch (e) {
      console.warn('Could not fetch support doubts:', e.message);
    }
    return [];
  }

  async fetchSupportTickets(filter = {}) {
    return this.fetchSupportDoubts(filter);
  }

  async checkSupportEligibility(skillName) {
    const res = await fetch(`${this.apiBase}/support/eligibility?skillName=${encodeURIComponent(skillName || '')}`, {
      headers: this.getAuthHeaders()
    });
    return await res.json();
  }

  async createSupportDoubt({ category, course, skillName, title, description, codeSnippet, issueType, sessionId, attachmentName, attachmentData }) {
    const res = await fetch(`${this.apiBase}/support/doubts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ category: category || skillName, course: course || skillName, skillName, title, description, codeSnippet, issueType, sessionId, attachmentName, attachmentData })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not create support doubt');
    return data;
  }

  async createSupportTicket(data) {
    return this.createSupportDoubt(data);
  }

  async acceptSupportDoubt(doubtId) {
    const res = await fetch(`${this.apiBase}/support/doubts/${doubtId}/accept`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    const data = await res.json();
    if (res.status === 409 || !data.success) {
      const err = new Error(data.error || 'This doubt has already been accepted by another user.');
      err.status = res.status;
      err.isConflict = (res.status === 409);
      throw err;
    }
    return data;
  }

  async claimSupportTicket(ticketId) {
    return this.acceptSupportDoubt(ticketId);
  }

  async submitDoubtAnswer(doubtId, { answerText, solution, classification, attachmentName, attachmentData, recommendedAssessmentSkill, recommendedQuizSkill }) {
    const res = await fetch(`${this.apiBase}/support/doubts/${doubtId}/answer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ answerText: answerText || solution, solution, classification, attachmentName, attachmentData, recommendedAssessmentSkill, recommendedQuizSkill })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not submit solution');
    await this.fetchWallet();
    return data;
  }

  async resolveSupportTicket(ticketId, data) {
    return this.submitDoubtAnswer(ticketId, data);
  }

  async rateSupportDoubt(doubtId, rating, feedback) {
    const res = await fetch(`${this.apiBase}/support/doubts/${doubtId}/rate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rating, feedback })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not rate support mentor');
    return data;
  }

  async rateSupportTicket(ticketId, rating, feedback) {
    return this.rateSupportDoubt(ticketId, rating, feedback);
  }
}

window.store = new SkillSwapStore();
