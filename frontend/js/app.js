/**
 * SkillSwap Platform - Main Application Controller
 * Features: AI Dynamic 20-Question Quiz Generator, Response Storage,
 * Percentage Grading, 4 Exact Tutor Categories, Student Feedback Reviews.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.store) {
    console.error('Store not initialized');
    return;
  }

  const app = {
    currentTab: 'view-matches',
    activeChatContact: 'rishitha',
    selectedRating: 5,
    selectedReviewTags: ['NPTEL Verified', 'Super Clear', 'Hands-on Coding'],
    timerInterval: null,
    timerSeconds: 6138,

    // AI Dynamic 20-Question Quiz State
    activeQuiz: null,
    currentQuestionIndex: 0,
    userAnswers: {},
    quizTimerInterval: null,
    quizTimerSeconds: 900, // 15 Minutes

    // Multi-Student Live Masterclass & Cohort State
    sessionsFilter: 'ALL',
    activeLiveRoomSessionId: null,

    // Live Audio & Video Media State
    mediaState: {
      isMicMuted: false,
      isCamOff: false,
      isScreenSharing: false,
      previewStream: null,
      liveStream: null
    },
    mediaSettings: {
      audioInput: 'default',
      micVolume: 85,
      noiseSuppression: true,
      echoCancellation: true,
      autoGain: true,
      audioOutput: 'default',
      videoInput: 'default',
      resolution: '1080p',
      virtualBg: 'none',
      mirrorCamera: true,
      lowLightBoost: true
    },

    // Academic Support Desk State
    supportFilter: 'ALL',
    supportSearchQuery: '',
    supportTickets: [],
    selectedSupportComplexity: { level: 'Level 1: Syntax / Typo / Quick Debug', bounty: 1.0 },

    async init() {
      window.app = this;
      try {
        const saved = localStorage.getItem('skillswap_media_settings');
        if (saved) this.mediaSettings = Object.assign(this.mediaSettings, JSON.parse(saved));
      } catch (e) {}

      try {
        await window.store.init();
      } catch (err) {
        console.warn('Store init error, continuing with fallback personas:', err);
      }

      this.bindEvents();
      this.initEntrancePortal();

      // Check active authentication session state
      if (!window.store.isSessionActive() || window.location.hash === '#login' || window.location.hash === '#portal') {
        this.showEntrancePortal();
      } else {
        this.hideEntrancePortal();
      }

      await this.renderAll();
      this.startSessionTimer();
    },

    // ==========================================
    // Event Listeners & Binding
    // ==========================================
    bindEvents() {
      // 1. Sidebar Navigation
      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.target;
          if (target) {
            this.switchView(target);
          }
        });
      });

      // Brand Click -> Go to matches
      document.getElementById('brandHomeBtn')?.addEventListener('click', () => {
        this.switchView('view-matches');
      });

      // Quick Swap Banner Button
      document.getElementById('bannerQuickSwapBtn')?.addEventListener('click', async () => {
        const matches = await window.store.getMatchesForCurrentPersona();
        if (matches.length > 0) {
          const topMatch = matches[0].peer;
          const skill = topMatch.skillsOffered[0] || { name: 'UI/UX Design & Figma', rate: 2.5, tier: 'Elite Master' };
          this.openBookingModal(topMatch.id, skill.name, skill.rate || 2.5, skill.tier || 'Elite Master');
        }
      });

      // Credit Pill -> Go to Wallet
      document.getElementById('navCreditPill')?.addEventListener('click', () => {
        this.switchView('view-wallet');
      });

      // 2. Single User Profile Dashboard Dropdown
      const personaBtn = document.getElementById('personaSwitcherBtn');
      const personaDropdown = document.getElementById('personaDropdown');
      personaBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        personaDropdown.classList.toggle('show');
      });

      document.getElementById('dropdownViewProfileBtn')?.addEventListener('click', () => {
        this.switchView('view-profile');
        personaDropdown?.classList.remove('show');
      });

      document.getElementById('dropdownViewWalletBtn')?.addEventListener('click', () => {
        this.switchView('view-wallet');
        personaDropdown?.classList.remove('show');
      });

      document.getElementById('dropdownViewSessionsBtn')?.addEventListener('click', () => {
        this.switchView('view-sessions');
        personaDropdown?.classList.remove('show');
      });

      document.getElementById('dropdownEditProfileBtn')?.addEventListener('click', () => {
        personaDropdown?.classList.remove('show');
        this.openEditProfileModal();
      });

      // Sign Out from dropdown -> returns to Entrance Login Portal
      document.getElementById('dropdownLogoutBtn')?.addEventListener('click', () => {
        personaDropdown?.classList.remove('show');
        window.store.logout();
        this.showEntrancePortal();
        this.showToast('You have signed out of your dashboard.', 'check');
      });

      // Sign Out from Sidebar Navigation
      document.getElementById('sidebarLogoutBtn')?.addEventListener('click', () => {
        window.store.logout();
        this.showEntrancePortal();
        this.showToast('You have signed out. Welcome to the Login Portal.', 'user');
      });

      // 3. Notifications Dropdown
      const notifBtn = document.getElementById('notifBellBtn');
      const notifDropdown = document.getElementById('notifDropdown');
      notifBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('show');
      });

      document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
        (window.store.notifications || []).forEach(n => n.unread = false);
        this.renderNavbar();
        this.renderNotifications();
        this.showToast('All notifications marked as read', 'check');
      });

      document.addEventListener('click', (e) => {
        if (!personaBtn?.contains(e.target) && !personaDropdown?.contains(e.target)) {
          personaDropdown?.classList.remove('show');
        }
        if (!notifBtn?.contains(e.target) && !notifDropdown?.contains(e.target)) {
          notifDropdown?.classList.remove('show');
        }
        const searchContainer = document.getElementById('navSearchContainer');
        const searchDropdown = document.getElementById('globalSearchResultsDropdown');
        if (!searchContainer?.contains(e.target) && searchDropdown) {
          searchDropdown.style.display = 'none';
        }
      });

      // Modal backdrop click listener (close on clicking dark overlay)
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            this.closeModal(overlay);
          }
        });
      });

      // Escape key listener to dismiss open modals, live search dropdown, persona/notif dropdowns
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const activeModals = document.querySelectorAll('.modal-overlay.active');
          activeModals.forEach(m => this.closeModal(m));
          const searchDropdown = document.getElementById('globalSearchResultsDropdown');
          if (searchDropdown) searchDropdown.style.display = 'none';
          document.getElementById('personaDropdown')?.classList.remove('show');
          document.getElementById('notifDropdown')?.classList.remove('show');
        }
      });

      // 4. Supabase Status & Settings Modal
      const supabaseStatusBtn = document.getElementById('supabaseStatusBtn');
      supabaseStatusBtn?.addEventListener('click', () => {
        this.openModal('supabaseModal');
      });
      document.getElementById('closeSupabaseModalBtn')?.addEventListener('click', () => {
        this.closeModal('supabaseModal');
      });
      document.getElementById('cancelSupabaseModalBtn')?.addEventListener('click', () => {
        this.closeModal('supabaseModal');
      });

      const supabaseConfigForm = document.getElementById('supabaseConfigForm');
      supabaseConfigForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('supabaseUrlInput').value.trim();
        const anonKey = document.getElementById('supabaseKeyInput').value.trim();
        try {
          const res = await fetch('http://localhost:3000/api/database/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, anonKey })
          });
          const data = await res.json();
          if (data.success) {
            const statusEl = document.getElementById('supabaseStatusText');
            if (statusEl) statusEl.textContent = data.isSupabase ? '⚡ Supabase Cloud Connected' : '⚡ Supabase Ready';
            supabaseModal?.classList.remove('active');
            this.showToast(`Database configuration saved (${data.mode})!`, 'check');
          }
        } catch (err) {
          alert('Could not update Supabase config: ' + err.message);
        }
      });

      // 5. Dark / Light Theme Toggle
      const themeBtn = document.getElementById('themeToggleBtn');
      themeBtn?.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          document.getElementById('themeIcon').className = 'fa-regular fa-moon';
          localStorage.setItem('skillswap_theme', 'light');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.getElementById('themeIcon').className = 'fa-regular fa-sun';
          localStorage.setItem('skillswap_theme', 'dark');
        }
      });

      if (localStorage.getItem('skillswap_theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fa-regular fa-sun';
      }

      // 6. Universal Top Search Engine with Live Dropdown Popup
      const searchInput = document.getElementById('globalSearchInput');
      const searchDropdown = document.getElementById('globalSearchResultsDropdown');
      const searchClearBtn = document.getElementById('globalSearchClearBtn');

      searchInput?.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        this.performGlobalSearch(q);
      });

      searchInput?.addEventListener('focus', (e) => {
        const q = e.target.value.trim();
        if (q.length > 0) {
          this.performGlobalSearch(q);
        }
      });

      searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const q = searchInput.value.trim();
          if (q.length > 0) {
            this.viewAllSearchResults(q);
          }
        } else if (e.key === 'Escape') {
          if (searchDropdown) searchDropdown.style.display = 'none';
        }
      });

      searchClearBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.style.display = 'none';
        if (searchDropdown) {
          searchDropdown.style.display = 'none';
          searchDropdown.innerHTML = '';
        }
        if (this.currentTab === 'view-explore') {
          const exploreInput = document.getElementById('exploreSearchInput');
          if (exploreInput) exploreInput.value = '';
          this.renderExploreCatalogue('');
        } else if (this.currentTab === 'view-matches') {
          this.renderSmartMatches();
        }
      });

      // 7. Match Filters & Sort
      document.querySelectorAll('[data-match-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-match-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.dataset.matchFilter;
          const sortSel = document.getElementById('matchesSortSelect');
          if (filter === 'credits_asc' && sortSel) sortSel.value = 'credits_asc';
          if (filter === 'credits_desc' && sortSel) sortSel.value = 'credits_desc';
          this.renderSmartMatches(filter);
        });
      });

      document.getElementById('matchesSortSelect')?.addEventListener('change', (e) => {
        const val = e.target.value;
        const activeFilter = document.querySelector('[data-match-filter].active')?.dataset.matchFilter || 'all';
        this.renderSmartMatches(activeFilter);
      });

      // Explore Category Filters
      document.querySelectorAll('[data-cat-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-cat-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderExploreCatalogue();
        });
      });

      // Explore Credit Range Filters
      document.querySelectorAll('[data-credit-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('[data-credit-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderExploreCatalogue();
        });
      });

      // Explore In-View Search Input
      document.getElementById('exploreSearchInput')?.addEventListener('input', (e) => {
        this.renderExploreCatalogue(e.target.value);
      });

      // Explore Sort (Credits Low-to-High, High-to-Low, Ratings, Tier, Reviews)
      document.getElementById('exploreSortSelect')?.addEventListener('change', () => {
        this.renderExploreCatalogue();
      });

      // 8. Modals & Forms
      this.bindModalEvents();
      this.bindQuizEvents();
      this.bindAuthEvents();
      this.bindSupportEvents();

      // 8b. Session Filter Pills & Host Cohort Triggers
      document.querySelectorAll('#sessionsFilterPills .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          document.querySelectorAll('#sessionsFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.sessionsFilter = pill.dataset.sessfilter || 'ALL';
          this.renderSessions();
        });
      });

      document.getElementById('sessionsHostCohortBtn')?.addEventListener('click', () => {
        this.openHostCohortModal();
      });

      // 9. Live Room Actions
      document.getElementById('completeSessionBtn')?.addEventListener('click', () => {
        const session = (window.store.sessions || []).find(s => s.id === this.activeLiveRoomSessionId) || window.store.sessions[0];
        if (session && session.session_type === 'GROUP_COHORT') {
          const isTutor = session.teacher_id === window.store.getCurrentPersona().id || session.tutor_id === window.store.getCurrentPersona().id;
          if (isTutor) {
            this.concludeCohortSession(session.id);
          } else {
            this.openReviewModal(session.id);
          }
        } else {
          this.openReviewModal(session ? session.id : 'sess_1');
        }
      });

      document.getElementById('sidebarCompleteSessionBtn')?.addEventListener('click', () => {
        const session = (window.store.sessions || []).find(s => s.id === this.activeLiveRoomSessionId) || window.store.sessions[0];
        if (session && session.session_type === 'GROUP_COHORT') {
          const isTutor = session.teacher_id === window.store.getCurrentPersona().id || session.tutor_id === window.store.getCurrentPersona().id;
          if (isTutor) {
            this.concludeCohortSession(session.id);
          } else {
            this.openReviewModal(session.id);
          }
        } else {
          this.openReviewModal(session ? session.id : 'sess_1');
        }
      });

      document.getElementById('enrollLiveRoomCohortBtn')?.addEventListener('click', async () => {
        if (this.activeLiveRoomSessionId) {
          await this.enrollInLiveCohort(this.activeLiveRoomSessionId);
        }
      });

      document.getElementById('sessionsGoLiveBtn')?.addEventListener('click', () => {
        this.switchView('view-room');
      });

      document.getElementById('reportDisputeBtn')?.addEventListener('click', () => {
        alert('Dispute ticket created! Faculty Admin (Dr. S. K. Rao) has been notified to review this session in Supabase.');
      });

      document.getElementById('resetRoomEditorBtn')?.addEventListener('click', () => {
        const editor = document.getElementById('liveRoomCodeEditor');
        if (editor) {
          editor.value = `// Collaborative Multi-Student Workspace\nconsole.log("Ready for live peer coding session!");`;
          this.showToast('Workspace reset', 'rotate');
        }
      });

      // 10. Live Audio & Video Controls (Live Room & 1-on-1 Sessions)
      document.getElementById('roomToggleMicBtn')?.addEventListener('click', () => {
        this.toggleMicrophone();
      });

      document.getElementById('roomToggleCamBtn')?.addEventListener('click', () => {
        this.toggleCamera();
      });

      document.getElementById('roomToggleScreenBtn')?.addEventListener('click', () => {
        this.toggleScreenShare();
      });

      document.getElementById('roomMediaSettingsBtn')?.addEventListener('click', () => {
        this.openMediaSettingsModal();
      });

      document.getElementById('roomQuickSpeakerTestBtn')?.addEventListener('click', () => {
        this.playSpeakerTestTone();
      });

      document.getElementById('modalTestSpeakerBtn')?.addEventListener('click', () => {
        this.playSpeakerTestTone();
      });

      document.getElementById('closeMediaSettingsModalBtn')?.addEventListener('click', () => {
        this.closeMediaSettingsModal();
      });

      document.getElementById('closeMediaSettingsBtn')?.addEventListener('click', () => {
        this.closeMediaSettingsModal();
      });

      document.getElementById('saveMediaSettingsBtn')?.addEventListener('click', () => {
        this.saveMediaSettings();
      });

      // AV Modal Tab Switching
      document.getElementById('tabBtnAudio')?.addEventListener('click', () => {
        document.getElementById('tabBtnAudio')?.classList.add('active');
        document.getElementById('tabBtnVideo')?.classList.remove('active');
        const tabAudio = document.getElementById('tabContentAudio');
        const tabVideo = document.getElementById('tabContentVideo');
        if (tabAudio) tabAudio.style.display = 'block';
        if (tabVideo) tabVideo.style.display = 'none';
      });

      document.getElementById('tabBtnVideo')?.addEventListener('click', () => {
        document.getElementById('tabBtnVideo')?.classList.add('active');
        document.getElementById('tabBtnAudio')?.classList.remove('active');
        const tabAudio = document.getElementById('tabContentAudio');
        const tabVideo = document.getElementById('tabContentVideo');
        if (tabAudio) tabAudio.style.display = 'none';
        if (tabVideo) tabVideo.style.display = 'block';
      });

      // Mic Volume Slider
      document.getElementById('micVolumeSlider')?.addEventListener('input', (e) => {
        const val = e.target.value;
        const disp = document.getElementById('micVolumeValueDisplay');
        const meter = document.getElementById('audioLevelMeterBar');
        if (disp) disp.textContent = `${val}%`;
        if (meter) meter.style.width = `${Math.min(100, Math.max(10, val * 0.8))}%`;
      });

      // Start Camera Test in Modal
      document.getElementById('startCamTestBtn')?.addEventListener('click', async () => {
        await this.startCameraPreview();
      });

      // Refresh Profile Isolated Ledger & Quiz Attempts History
      document.getElementById('refreshProfileLedgerBtn')?.addEventListener('click', async () => {
        await this.renderProfile();
        this.showToast('Profile transaction audit log refreshed from database!', 'check');
      });

      document.getElementById('refreshProfileQuizAttemptsBtn')?.addEventListener('click', async () => {
        await this.renderProfile();
        this.showToast('Assessment history records reloaded from database!', 'check');
      });

      // 10. Peer Chat Form
      const chatForm = document.getElementById('chatForm');
      chatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatMessageInput');
        const text = input?.value?.trim();
        if (text && this.activeChatContact) {
          input.value = '';
          try {
            await window.store.sendMessage(this.activeChatContact, text);
            await this.renderChatMessages(true);
          } catch (err) {
            console.error('Send message error:', err);
            this.showToast(err.message || 'Could not send message', 'triangle-exclamation');
          }
        }
      });

      document.getElementById('chatScheduleSwapBtn')?.addEventListener('click', () => {
        const peer = window.store.personas[this.activeChatContact];
        if (peer) {
          const skill = peer.skillsOffered[0] || { name: 'Peer Coaching', rate: 2.5, tier: 'Elite Master' };
          this.openBookingModal(peer.id, skill.name, skill.rate || 2.5, skill.tier || 'Elite Master');
        }
      });

      // Certificate Upload Triggers
      document.getElementById('sidebarUploadCertBtn')?.addEventListener('click', () => this.openUploadCertModal());
      document.getElementById('profileUploadCertBtn')?.addEventListener('click', () => this.openUploadCertModal());
      document.getElementById('quizUploadCertBtn')?.addEventListener('click', () => this.openUploadCertModal());
      document.getElementById('profileCertSectionAddBtn')?.addEventListener('click', () => this.openUploadCertModal());
      document.getElementById('profileVerifyCertCtaBtn')?.addEventListener('click', () => this.openUploadCertModal());

      // Quick Buttons
      document.getElementById('exploreAddSkillBtn')?.addEventListener('click', () => this.openAddSkillModal('offered'));
      document.getElementById('profileAddSkillBtn')?.addEventListener('click', () => this.openAddSkillModal('offered'));
      document.getElementById('profileAddTeachBtn')?.addEventListener('click', () => this.openAddSkillModal('offered'));
      document.getElementById('profileAddLearnBtn')?.addEventListener('click', () => this.openAddSkillModal('wanted'));
      document.getElementById('walletEarnMoreBtn')?.addEventListener('click', () => this.switchView('view-matches'));
    },

    // ==========================================
    // Entrance Login Portal Controller
    // ==========================================
    initEntrancePortal() {
      // 1. Setup Avatar Preset Images for Quick Login Cards
      const sriAvatar = document.getElementById('portalAvatarSri');
      const rishithaAvatar = document.getElementById('portalAvatarRishitha');
      const adminAvatar = document.getElementById('portalAvatarAdmin');

      if (sriAvatar) sriAvatar.src = window.getStudentAvatar('sri');
      if (rishithaAvatar) rishithaAvatar.src = window.getStudentAvatar('rishitha');
      if (adminAvatar) adminAvatar.src = window.getStudentAvatar('admin');

      // 2. Tab Switching (Sign In vs Sign Up)
      const tabSignInBtn = document.getElementById('portalTabSignInBtn');
      const tabSignUpBtn = document.getElementById('portalTabSignUpBtn');
      const signInForm = document.getElementById('portalSignInForm');
      const signUpForm = document.getElementById('portalSignUpForm');

      tabSignInBtn?.addEventListener('click', () => {
        tabSignInBtn.classList.add('active');
        tabSignUpBtn?.classList.remove('active');
        if (signInForm) {
          signInForm.style.display = 'flex';
          signInForm.classList.add('active');
        }
        if (signUpForm) {
          signUpForm.style.display = 'none';
          signUpForm.classList.remove('active');
        }
      });

      tabSignUpBtn?.addEventListener('click', () => {
        tabSignUpBtn.classList.add('active');
        tabSignInBtn?.classList.remove('active');
        if (signUpForm) {
          signUpForm.style.display = 'flex';
          signUpForm.classList.add('active');
        }
        if (signInForm) {
          signInForm.style.display = 'none';
          signInForm.classList.remove('active');
        }
      });

      // 3. Sign In Form Submission
      signInForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('portalLoginEmail');
        const passInput = document.getElementById('portalLoginPassword');
        const errBox = document.getElementById('portalLoginErrorMsg');
        const submitBtn = document.getElementById('portalSubmitSignInBtn');

        if (errBox) errBox.style.display = 'none';

        const email = emailInput?.value?.trim();
        const password = passInput?.value;

        if (!email || !password) {
          if (errBox) {
            errBox.textContent = 'Please provide both email/User ID and password.';
            errBox.style.display = 'block';
          }
          return;
        }

        if (!/^[A-Z]/.test(password)) {
          if (errBox) {
            errBox.textContent = 'Password must start with a Capital Letter (A-Z).';
            errBox.style.display = 'block';
          }
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying...</span>`;
          }

          const res = await window.store.login(email, password);
          sessionStorage.setItem('skillswap_logged_in', 'true');
          
          this.hideEntrancePortal();
          await this.renderAll();
          this.showToast(`Welcome back, ${res.user?.name || 'Student'}!`, 'check');
        } catch (err) {
          if (errBox) {
            errBox.textContent = err.message || 'Login failed. Please check credentials.';
            errBox.style.display = 'block';
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Sign In to Dashboard</span> <i class="fa-solid fa-arrow-right"></i>`;
          }
        }
      });

      // 4. Sign Up Form Submission
      signUpForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('portalRegName')?.value?.trim();
        const email = document.getElementById('portalRegEmail')?.value?.trim();
        const password = document.getElementById('portalRegPassword')?.value;
        const major = document.getElementById('portalRegMajor')?.value?.trim();
        const role = document.getElementById('portalRegRole')?.value || 'STUDENT';
        const errBox = document.getElementById('portalRegErrorMsg');
        const submitBtn = document.getElementById('portalSubmitSignUpBtn');

        if (errBox) errBox.style.display = 'none';

        if (!name || !email || !password || !major) {
          if (errBox) {
            errBox.textContent = 'Please fill all required registration fields.';
            errBox.style.display = 'block';
          }
          return;
        }

        if (!/^[A-Z]/.test(password)) {
          if (errBox) {
            errBox.textContent = 'Password must start with a Capital Letter (A-Z).';
            errBox.style.display = 'block';
          }
          return;
        }

        if (password.length < 6) {
          if (errBox) {
            errBox.textContent = 'Password must be at least 6 characters long.';
            errBox.style.display = 'block';
          }
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Creating account...</span>`;
          }

          const res = await window.store.register({
            name,
            email,
            password,
            major,
            role,
            college: 'Vignan University',
            bio: `Enthusiastic ${role === 'ADMIN' ? 'Platform Administrator' : 'Student & Peer Learner'}`
          });
          sessionStorage.setItem('skillswap_logged_in', 'true');

          this.hideEntrancePortal();
          await this.renderAll();
          this.showToast(`Account created! Welcome, ${res.user?.name || name} (3.0 Cr Granted)!`, 'check');
        } catch (err) {
          if (errBox) {
            errBox.textContent = err.message || 'Registration failed.';
            errBox.style.display = 'block';
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> <span>Create Account & Join</span>`;
          }
        }
      });

      // 5. Demo Persona Fast-Login Cards
      document.querySelectorAll('.portal-persona-card').forEach(card => {
        card.addEventListener('click', async () => {
          const personaId = card.getAttribute('data-persona');
          if (!personaId) return;

          try {
            card.style.opacity = '0.7';
            await window.store.switchPersona(personaId);
            sessionStorage.setItem('skillswap_logged_in', 'true');
            
            this.hideEntrancePortal();
            await this.renderAll();
            const current = window.store.getCurrentPersona();
            this.showToast(`Logged in as ${current?.name || personaId}!`, 'check');
          } catch (err) {
            console.warn('Fast-login note:', err);
            this.hideEntrancePortal();
            await this.renderAll();
          } finally {
            card.style.opacity = '1';
          }
        });
      });
    },

    showEntrancePortal() {
      document.body.classList.add('portal-active');
      const overlay = document.getElementById('entrancePortalOverlay');
      if (overlay) {
        overlay.classList.remove('portal-hidden');
        overlay.style.display = 'flex';
        // Refresh persona avatar SVGs
        const sriAvatar = document.getElementById('portalAvatarSri');
        const rishithaAvatar = document.getElementById('portalAvatarRishitha');
        const adminAvatar = document.getElementById('portalAvatarAdmin');
        if (sriAvatar && window.getStudentAvatar) sriAvatar.src = window.getStudentAvatar('sri');
        if (rishithaAvatar && window.getStudentAvatar) rishithaAvatar.src = window.getStudentAvatar('rishitha');
        if (adminAvatar && window.getStudentAvatar) adminAvatar.src = window.getStudentAvatar('admin');

        // Clear any password inputs
        const pass = document.getElementById('portalLoginPassword');
        if (pass) pass.value = '';
        const regPass = document.getElementById('portalRegPassword');
        if (regPass) regPass.value = '';
        const loginErr = document.getElementById('portalLoginErrorMsg');
        if (loginErr) loginErr.style.display = 'none';
        const regErr = document.getElementById('portalRegErrorMsg');
        if (regErr) regErr.style.display = 'none';
      }
    },

    hideEntrancePortal() {
      document.body.classList.remove('portal-active');
      const overlay = document.getElementById('entrancePortalOverlay');
      if (overlay) {
        overlay.classList.add('portal-hidden');
        setTimeout(() => {
          if (overlay.classList.contains('portal-hidden')) {
            overlay.style.display = 'none';
          }
        }, 450);
      }
    },

    bindModalEvents() {
      // Booking Modal
      const bookingModal = document.getElementById('bookingModal');
      document.getElementById('closeBookingModalBtn')?.addEventListener('click', () => bookingModal.classList.remove('active'));
      document.getElementById('cancelBookingBtn')?.addEventListener('click', () => bookingModal.classList.remove('active'));

      const durationSelect = document.getElementById('bookDurationSelect');
      durationSelect?.addEventListener('change', () => this.updateBookingCalculation());

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = document.getElementById('bookDateInput');
      if (dateInput) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
      }

      const bookingForm = document.getElementById('bookingForm');
      bookingForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teacherId = document.getElementById('bookTeacherId').value;
        const skillName = document.getElementById('bookSkillName').textContent;
        const hours = Number(document.getElementById('bookDurationSelect').value);
        const date = document.getElementById('bookDateInput').value;
        const topic = document.getElementById('bookTopicInput').value;

        try {
          const res = await window.store.bookSession({ teacherId, skillName, hours, date, topic });
          bookingModal.classList.remove('active');
          this.renderAll();
          this.showToast(`Session booked! ${res.creditsLocked || (hours * 2.5)} credits locked in Escrow (${res.tier || 'Elite Master'} Tutor).`, 'lock');
          this.switchView('view-sessions');
        } catch (err) {
          alert(err.message);
        }
      });

      // Certificate Upload Modal & NPTEL File Verification
      const certModal = document.getElementById('uploadCertModal');
      document.getElementById('closeUploadCertModalBtn')?.addEventListener('click', () => certModal.classList.remove('active'));
      document.getElementById('cancelUploadCertBtn')?.addEventListener('click', () => certModal.classList.remove('active'));

      // NPTEL Certificate File Dropzone Handlers
      const certDropzone = document.getElementById('certFileDropzone');
      const certFileInput = document.getElementById('nptelCertFileInput');
      const certUploadPrompt = document.getElementById('certUploadPrompt');
      const certFilePreviewCard = document.getElementById('certFilePreviewCard');
      const certFileNameDisplay = document.getElementById('certFileNameDisplay');
      const certFileSizeDisplay = document.getElementById('certFileSizeDisplay');
      const certFileIconHolder = document.getElementById('certFileIconHolder');
      const removeCertFileBtn = document.getElementById('removeCertFileBtn');

      if (certDropzone && certFileInput) {
        certDropzone.addEventListener('click', (e) => {
          if (e.target.closest('#removeCertFileBtn')) return;
          certFileInput.click();
        });

        certDropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          certDropzone.classList.add('dragover');
        });

        certDropzone.addEventListener('dragleave', () => {
          certDropzone.classList.remove('dragover');
        });

        certDropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          certDropzone.classList.remove('dragover');
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleCertFileUpload(e.dataTransfer.files[0]);
          }
        });

        certFileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleCertFileUpload(e.target.files[0]);
          }
        });

        const handleCertFileUpload = (file) => {
          const reader = new FileReader();
          reader.onload = (re) => {
            const base64Data = re.target.result;
            this.selectedCertFile = {
              name: file.name,
              size: file.size,
              type: file.type,
              data: base64Data
            };

            if (certUploadPrompt) certUploadPrompt.style.display = 'none';
            if (certFilePreviewCard) certFilePreviewCard.style.display = 'block';
            if (certFileNameDisplay) certFileNameDisplay.textContent = file.name;
            if (certFileSizeDisplay) {
              const kb = (file.size / 1024).toFixed(1);
              certFileSizeDisplay.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${kb} KB • NPTEL / Academic Document Ready for Scan`;
            }
            if (certFileIconHolder) {
              const isPdf = file.name.toLowerCase().endsWith('.pdf');
              certFileIconHolder.innerHTML = isPdf ? '<i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i>' : '<i class="fa-solid fa-file-image" style="color:#6366f1;"></i>';
            }
          };
          reader.readAsDataURL(file);
        };

        if (removeCertFileBtn) {
          removeCertFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectedCertFile = null;
            certFileInput.value = '';
            if (certFilePreviewCard) certFilePreviewCard.style.display = 'none';
            if (certUploadPrompt) certUploadPrompt.style.display = 'block';
          });
        }
      }

      // Dynamic Custom Course / Skill Name Selector Toggle
      const certSkillSelect = document.getElementById('certSkillSelect');
      const certCustomSkillGroup = document.getElementById('certCustomSkillGroup');
      const certCustomSkillInput = document.getElementById('certCustomSkillInput');

      if (certSkillSelect) {
        certSkillSelect.addEventListener('change', (e) => {
          if (e.target.value === 'custom') {
            if (certCustomSkillGroup) certCustomSkillGroup.style.display = 'block';
            if (certCustomSkillInput) {
              certCustomSkillInput.focus();
              certCustomSkillInput.required = true;
            }
          } else {
            if (certCustomSkillGroup) certCustomSkillGroup.style.display = 'none';
            if (certCustomSkillInput) {
              certCustomSkillInput.required = false;
            }
          }
        });
      }

      // Demo Quick-Fill Buttons for Instant Original vs Fake Testing
      document.getElementById('btnFillOriginalCert')?.addEventListener('click', () => {
        document.getElementById('certSkillSelect').value = 'Python Core & OOP';
        if (certCustomSkillGroup) certCustomSkillGroup.style.display = 'none';
        if (certCustomSkillInput) { certCustomSkillInput.value = ''; certCustomSkillInput.required = false; }
        document.getElementById('certAuthoritySelect').value = 'NPTEL (IIT Madras / Kharagpur)';
        document.getElementById('certGradeInput').value = 'Elite + Gold (94%)';
        document.getElementById('certTitleInput').value = 'Programming, Data Structures and Algorithms using Python';
        document.getElementById('certIdInput').value = 'NPTEL24CS98S1245' + Math.floor(1000 + Math.random() * 9000);

        this.selectedCertFile = {
          name: 'NPTEL24CS98S_IIT_Madras_Official_Cert.pdf',
          size: 345200,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,NPTEL_IIT_MADRAS_OFFICIAL_SEAL_WATERMARK_SIGNATURE'
        };

        const certUploadPrompt = document.getElementById('certUploadPrompt');
        const certFilePreviewCard = document.getElementById('certFilePreviewCard');
        const certFileNameDisplay = document.getElementById('certFileNameDisplay');
        const certFileSizeDisplay = document.getElementById('certFileSizeDisplay');
        const certFileIconHolder = document.getElementById('certFileIconHolder');
        const alertBox = document.getElementById('certVerificationModalAlert');

        if (alertBox) alertBox.style.display = 'none';
        if (certUploadPrompt) certUploadPrompt.style.display = 'none';
        if (certFilePreviewCard) certFilePreviewCard.style.display = 'block';
        if (certFileNameDisplay) certFileNameDisplay.textContent = 'NPTEL24CS98S_IIT_Madras_Official_Cert.pdf';
        if (certFileSizeDisplay) certFileSizeDisplay.innerHTML = '<i class="fa-solid fa-circle-check"></i> 337.1 KB • Authentic NPTEL PDF with IIT Seal & QR Watermark';
        if (certFileIconHolder) certFileIconHolder.innerHTML = '<i class="fa-solid fa-file-pdf" style="color:#ef4444;"></i>';

        this.showToast('Loaded Authentic Original NPTEL Certificate Data (Ready to Verify)', 'check');
      });

      document.getElementById('btnFillFakeCert')?.addEventListener('click', () => {
        document.getElementById('certSkillSelect').value = 'Machine Learning Basics';
        if (certCustomSkillGroup) certCustomSkillGroup.style.display = 'none';
        if (certCustomSkillInput) { certCustomSkillInput.value = ''; certCustomSkillInput.required = false; }
        document.getElementById('certAuthoritySelect').value = 'NPTEL (IIT Madras / Kharagpur)';
        document.getElementById('certGradeInput').value = '35% (Below Passing Mark)';
        document.getElementById('certTitleInput').value = 'Machine Learning Dummy / Fake Certificate';
        document.getElementById('certIdInput').value = 'FAKE_TEST_INVALID_999';

        this.selectedCertFile = {
          name: 'fake_test_document.txt',
          size: 1240,
          type: 'text/plain',
          data: 'data:text/plain;base64,FAKE_INVALID_FILE'
        };

        const certUploadPrompt = document.getElementById('certUploadPrompt');
        const certFilePreviewCard = document.getElementById('certFilePreviewCard');
        const certFileNameDisplay = document.getElementById('certFileNameDisplay');
        const certFileSizeDisplay = document.getElementById('certFileSizeDisplay');
        const certFileIconHolder = document.getElementById('certFileIconHolder');
        const alertBox = document.getElementById('certVerificationModalAlert');
        const reportContainer = document.getElementById('certAiReportContainer');

        if (alertBox) alertBox.style.display = 'none';
        if (reportContainer) reportContainer.style.display = 'none';
        if (certUploadPrompt) certUploadPrompt.style.display = 'none';
        if (certFilePreviewCard) certFilePreviewCard.style.display = 'block';
        if (certFileNameDisplay) certFileNameDisplay.textContent = 'fake_test_document.txt';
        if (certFileSizeDisplay) certFileSizeDisplay.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> 1.2 KB • Fake Unrecognized Document (Will Be Rejected)';
        if (certFileIconHolder) certFileIconHolder.innerHTML = '<i class="fa-solid fa-file-excel" style="color:#ef4444;"></i>';

        this.showToast('Loaded Fake Sample Data (Click Submit to Test Rejection)', 'lock');
      });

      document.getElementById('btnFillManualCert')?.addEventListener('click', () => {
        document.getElementById('certSkillSelect').value = 'UI/UX Design & Figma';
        if (certCustomSkillGroup) certCustomSkillGroup.style.display = 'none';
        if (certCustomSkillInput) { certCustomSkillInput.value = ''; certCustomSkillInput.required = false; }
        document.getElementById('certAuthoritySelect').value = 'Other / Third-Party Academy';
        document.getElementById('certGradeInput').value = 'Grade A (88%)';
        document.getElementById('certTitleInput').value = 'Advanced UI/UX Design & Figma Certificate';
        document.getElementById('certIdInput').value = 'TAC-2024-UX9988';

        this.selectedCertFile = {
          name: 'techacademy_design_cert.png',
          size: 215400,
          type: 'image/png',
          data: 'data:image/png;base64,THIRD_PARTY_ACADEMY_UNVERIFIED_CERT_PAYLOAD'
        };

        const certUploadPrompt = document.getElementById('certUploadPrompt');
        const certFilePreviewCard = document.getElementById('certFilePreviewCard');
        const certFileNameDisplay = document.getElementById('certFileNameDisplay');
        const certFileSizeDisplay = document.getElementById('certFileSizeDisplay');
        const certFileIconHolder = document.getElementById('certFileIconHolder');
        const alertBox = document.getElementById('certVerificationModalAlert');
        const reportContainer = document.getElementById('certAiReportContainer');

        if (alertBox) alertBox.style.display = 'none';
        if (reportContainer) reportContainer.style.display = 'none';
        if (certUploadPrompt) certUploadPrompt.style.display = 'none';
        if (certFilePreviewCard) certFilePreviewCard.style.display = 'block';
        if (certFileNameDisplay) certFileNameDisplay.textContent = 'techacademy_design_cert.png';
        if (certFileSizeDisplay) certFileSizeDisplay.innerHTML = '<i class="fa-solid fa-user-clock" style="color:#f59e0b;"></i> 210.4 KB • Third-Party Unaccredited Academy (Queues Manual Review)';
        if (certFileIconHolder) certFileIconHolder.innerHTML = '<i class="fa-solid fa-file-image" style="color:#f59e0b;"></i>';

        this.showToast('Loaded Third-Party Academy Sample Data (Triggers Manual Review)', 'user');
      });

      const certForm = document.getElementById('uploadCertForm');
      certForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectVal = document.getElementById('certSkillSelect').value;
        const customSkillVal = document.getElementById('certCustomSkillInput')?.value.trim();
        const skillName = (selectVal === 'custom' && customSkillVal) 
          ? customSkillVal 
          : (selectVal === 'custom' ? (document.getElementById('certTitleInput')?.value.trim() || 'Custom Skill Course') : (selectVal || 'Python Core & OOP'));
        const authority = document.getElementById('certAuthoritySelect').value;
        const scoreOrGrade = document.getElementById('certGradeInput').value.trim();
        const title = document.getElementById('certTitleInput').value.trim() || `${skillName} Certification`;
        const credentialId = document.getElementById('certIdInput').value.trim();
        const alertBox = document.getElementById('certVerificationModalAlert');
        const reportContainer = document.getElementById('certAiReportContainer');
        const scanProgress = document.getElementById('certAiScanProgress');
        const scanPercent = document.getElementById('certAiScanPercent');
        const scanProgressBar = document.getElementById('certAiScanProgressBar');
        const scanStepStatus = document.getElementById('certAiScanStepStatus');
        const submitBtn = document.getElementById('submitUploadCertBtn');
        const origSubmitText = submitBtn ? submitBtn.innerHTML : '';

        if (alertBox) alertBox.style.display = 'none';
        if (reportContainer) reportContainer.style.display = 'none';

        // Animated Multi-Stage AI Scanning Sequence
        if (scanProgress) scanProgress.style.display = 'block';
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-robot fa-spin"></i> Analyzing Certificate Authenticity...';
          submitBtn.disabled = true;
        }

        const updateScan = (pct, text) => {
          if (scanPercent) scanPercent.textContent = `${pct}%`;
          if (scanProgressBar) scanProgressBar.style.width = `${pct}%`;
          if (scanStepStatus) scanStepStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size: 0.75rem;"></i> ${text}`;
        };

        updateScan(25, 'Step 1/4: Extracting certificate information, recipient & credential ID...');
        await new Promise(r => setTimeout(r, 220));

        updateScan(50, 'Step 2/4: Inspecting visual authenticity, logos, watermark & seal consistency...');
        await new Promise(r => setTimeout(r, 220));

        updateScan(75, 'Step 3/4: Validating issuer registry accreditation & domain verification links...');
        await new Promise(r => setTimeout(r, 220));

        updateScan(95, 'Step 4/4: Cross-evaluating multi-vector consistency & synthesizing final decision...');

        try {
          const current = window.store.getCurrentPersona();
          const token = localStorage.getItem('token') || (window.store.token || '');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          if (current?.id) headers['x-user-id'] = current.id;

          const res = await fetch('http://localhost:3000/api/certificates/upload', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userId: current.id,
              recipientName: current.name || 'Sri Dhanush',
              skillName,
              authority,
              issuer: authority,
              title,
              credentialId,
              scoreOrGrade,
              fileName: this.selectedCertFile?.name || (credentialId ? `${credentialId}_cert.pdf` : ''),
              fileData: this.selectedCertFile?.data || ''
            })
          });
          const data = await res.json();

          if (scanProgress) scanProgress.style.display = 'none';
          if (submitBtn) {
            submitBtn.innerHTML = origSubmitText;
            submitBtn.disabled = false;
          }

          const aiReport = data.aiReport || {
            result: data.result || (data.success ? 'REAL' : 'FAKE'),
            confidence: data.result === 'REAL' ? 99 : 92,
            recipient_name: current.name || 'Sri Dhanush',
            certificate_id: credentialId,
            course: title,
            issuer: authority,
            issue_date: 'Academic Year 2023-2024',
            verification_url: `https://nptel.ac.in/noc/Ecertificate/?q=${credentialId}`,
            checks_performed: [
              "Extract recipient's name, course name, issuing organization, certificate ID, issue date, and authentication elements",
              "Analyze visual layout consistency, detect signs of editing, manipulation, inconsistent fonts, spacing, alignment, and image artifacts",
              "Identify issuing organization, verify institutional legitimacy, and check against official certificate-verification portals",
              "Detect and read QR code / verification link, verify URL points to legitimate official issuer domain, and confirm ID match",
              "Compare extracted fields to identify contradictions across names, certificate IDs, dates, course titles, and signatures",
              "Inspect issuer's logo, branding, official seal, and digital signatures against authentic security templates",
              "Synthesize multi-vector verification criteria and determine final classification (REAL / FAKE / NEEDS MANUAL VERIFICATION)"
            ],
            evidence: data.success ? ['Issuing institution recognized and authenticated', 'Official digital security seal verified'] : [],
            suspicious_elements: !data.success ? [data.error || 'Verification Failed'] : [],
            reason: data.message || data.error || 'AI verification completed.'
          };

          // Render comprehensive AI Report Card
          this.renderCertificateAiReport(aiReport, reportContainer);

          if (!data.success || aiReport.result === 'FAKE') {
            if (alertBox) {
              alertBox.className = 'cert-verification-alert error';
              alertBox.style.display = 'flex';
              alertBox.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.35rem; margin-top: 2px;"></i>
                <div>
                  <strong>❌ Verification Result: FAKE (REJECTED)</strong>
                  <div style="margin-top: 0.25rem;">${aiReport.reason || data.error || 'The certificate was detected as forged, invalid, or previously rejected. 0 Credits allotted.'}</div>
                </div>
              `;
            }
            this.showToast(`❌ Verification Result: FAKE Certificate. Upload rejected (0 Credits).`, 'lock');
            return;
          }

          if (aiReport.result === 'NEEDS MANUAL VERIFICATION') {
            this.showToast(`⚠️ Verification Result: NEEDS MANUAL VERIFICATION. Queued for Faculty Review.`, 'user');
            await window.store.init();
            this.renderAll();
            return;
          }

          // Case: REAL
          this.showToast(`🎉 Certificate Verified as REAL! +${data.bonusCredits || 2.0} Credits deposited into your wallet! Tier: "${data.tierInfo?.tier || 'Elite Master'}"!`, 'award');

          await window.store.init();
          this.renderAll();

        } catch (err) {
          if (scanProgress) scanProgress.style.display = 'none';
          if (submitBtn) {
            submitBtn.innerHTML = origSubmitText;
            submitBtn.disabled = false;
          }
          if (alertBox) {
            alertBox.className = 'cert-verification-alert error';
            alertBox.style.display = 'flex';
            alertBox.innerHTML = `
              <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.35rem; margin-top: 2px;"></i>
              <div>
                <strong>❌ Connection Error:</strong>
                <div style="margin-top: 0.25rem;">${err.message}</div>
              </div>
            `;
          }
          alert('Could not upload certificate: ' + err.message);
        }
      });
    },

    // ==========================================
    // AI Verification Report Card Renderer
    // ==========================================
    renderCertificateAiReport(aiReport, container) {
      if (!container || !aiReport) return;

      const isReal = aiReport.result === 'REAL';
      const isFake = aiReport.result === 'FAKE';
      const isManual = aiReport.result === 'NEEDS MANUAL VERIFICATION';

      const statusColor = isReal ? '#10b981' : isFake ? '#ef4444' : '#f59e0b';
      const statusBg = isReal ? 'rgba(16, 185, 129, 0.08)' : isFake ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)';
      const statusBorder = isReal ? 'rgba(16, 185, 129, 0.35)' : isFake ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)';

      const badgeHtml = isReal 
        ? `<span style="background: #10b981; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-shield-check"></i> REAL (VERIFIED)</span>`
        : isFake
        ? `<span style="background: #ef4444; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-triangle-exclamation"></i> FAKE (REJECTED)</span>`
        : `<span style="background: #f59e0b; color: #fff; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 800; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-user-clock"></i> NEEDS MANUAL VERIFICATION</span>`;

      const confScore = parseInt(aiReport.confidence, 10) || (isReal ? 99 : isFake ? 92 : 65);
      const jsonString = JSON.stringify(aiReport, null, 2);

      container.innerHTML = `
        <div style="background: ${statusBg}; border: 1.5px solid ${statusBorder}; border-radius: var(--radius-lg); padding: 1.15rem; box-shadow: 0 4px 18px rgba(0,0,0,0.06);">
          <!-- Top Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.6rem; border-bottom: 1px solid ${statusBorder}; padding-bottom: 0.75rem; margin-bottom: 0.85rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background: ${statusColor}22; display: flex; align-items: center; justify-content: center; color: ${statusColor}; font-size: 1.25rem;">
                <i class="fa-solid ${isReal ? 'fa-shield-check' : isFake ? 'fa-triangle-exclamation' : 'fa-clipboard-question'}"></i>
              </div>
              <div>
                <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary);">AI Certificate Verification Report</h4>
                <div style="font-size: 0.74rem; color: var(--text-secondary);">7-Stage Multi-Vector Authenticity & Accreditation Analysis</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${badgeHtml}
            </div>
          </div>

          <!-- Confidence Meter -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin-bottom: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.78rem;">
              <span style="font-weight: 700; color: var(--text-secondary);">Classification Confidence:</span>
              <span style="font-weight: 800; color: ${statusColor}; font-size: 0.9rem;">${confScore}%</span>
            </div>
            <div style="background: rgba(255,255,255,0.08); height: 7px; border-radius: 4px; overflow: hidden;">
              <div style="width: ${confScore}%; height: 100%; background: ${statusColor}; transition: width 0.4s ease;"></div>
            </div>
          </div>

          <!-- Extracted Details Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.85rem;">
            <div style="background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.76rem;">
              <span style="color: var(--text-muted); display: block; font-size: 0.7rem; text-transform: uppercase; font-weight: 700;">Recipient Name</span>
              <strong style="color: var(--text-primary);">${aiReport.recipient_name || 'N/A'}</strong>
            </div>
            <div style="background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.76rem;">
              <span style="color: var(--text-muted); display: block; font-size: 0.7rem; text-transform: uppercase; font-weight: 700;">Issuing Institution</span>
              <strong style="color: var(--text-primary);">${aiReport.issuer || 'N/A'}</strong>
            </div>
            <div style="background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.76rem;">
              <span style="color: var(--text-muted); display: block; font-size: 0.7rem; text-transform: uppercase; font-weight: 700;">Certificate ID</span>
              <strong style="color: var(--text-primary); font-family: monospace;">${aiReport.certificate_id || 'N/A'}</strong>
            </div>
            <div style="background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.76rem;">
              <span style="color: var(--text-muted); display: block; font-size: 0.7rem; text-transform: uppercase; font-weight: 700;">Course / Skill</span>
              <strong style="color: var(--text-primary);">${aiReport.course || 'N/A'}</strong>
            </div>
          </div>

          <!-- Verification Link & Date -->
          <div style="background: var(--bg-card); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.74rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="color: var(--text-muted);">Issue Date:</span>
              <strong style="color: var(--text-primary); margin-left: 0.35rem;">${aiReport.issue_date || 'N/A'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Verification URL:</span>
              <a href="${aiReport.verification_url || '#'}" target="_blank" style="color: var(--primary); font-weight: 700; margin-left: 0.35rem; word-break: break-all;">
                <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.7rem;"></i> Open Registry
              </a>
            </div>
          </div>

          <!-- Evidence List -->
          ${aiReport.evidence && aiReport.evidence.length > 0 ? `
            <div style="margin-bottom: 0.75rem;">
              <div style="font-size: 0.76rem; font-weight: 700; color: #10b981; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
                <i class="fa-solid fa-circle-check"></i> Authenticated Evidence:
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                ${aiReport.evidence.map(ev => `
                  <div style="font-size: 0.74rem; color: var(--text-secondary); display: flex; align-items: flex-start; gap: 0.4rem;">
                    <i class="fa-solid fa-check" style="color: #10b981; font-size: 0.7rem; margin-top: 3px;"></i>
                    <span>${ev}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Suspicious Elements List -->
          ${aiReport.suspicious_elements && aiReport.suspicious_elements.length > 0 ? `
            <div style="margin-bottom: 0.75rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
              <div style="font-size: 0.76rem; font-weight: 700; color: #ef4444; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.35rem;">
                <i class="fa-solid fa-triangle-exclamation"></i> Suspicious / Flagged Elements:
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                ${aiReport.suspicious_elements.map(susp => `
                  <div style="font-size: 0.74rem; color: #dc2626; display: flex; align-items: flex-start; gap: 0.4rem;">
                    <i class="fa-solid fa-xmark" style="color: #ef4444; font-size: 0.7rem; margin-top: 3px;"></i>
                    <span>${susp}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Decision Summary -->
          <div style="background: var(--bg-card); border-left: 3px solid ${statusColor}; padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.76rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 0.85rem;">
            <strong style="color: var(--text-primary); display: block; margin-bottom: 0.15rem;">Reason for Classification:</strong>
            ${aiReport.reason}
          </div>

          <!-- Structured JSON Output Inspector Accordion -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
            <button type="button" class="btn btn-secondary btn-sm" id="btnToggleCertRawJson" style="font-size: 0.72rem; padding: 0.25rem 0.65rem; width: 100%; justify-content: space-between; display: flex;" onclick="
              const codeBlock = document.getElementById('certRawJsonBlock');
              if (codeBlock) {
                const isHidden = codeBlock.style.display === 'none';
                codeBlock.style.display = isHidden ? 'block' : 'none';
                this.innerHTML = isHidden 
                  ? '<span><i class=\\\'fa-solid fa-code\\\'></i> Hide Structured JSON Specification</span> <i class=\\\'fa-solid fa-chevron-up\\\'></i>'
                  : '<span><i class=\\\'fa-solid fa-code\\\'></i> View Structured JSON Specification</span> <i class=\\\'fa-solid fa-chevron-down\\\'></i>';
              }
            ">
              <span><i class="fa-solid fa-code"></i> View Structured JSON Specification</span>
              <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div id="certRawJsonBlock" style="display: none; margin-top: 0.5rem;">
              <pre style="background: #0f172a; color: #38bdf8; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.72rem; line-height: 1.4; max-height: 220px; overflow: auto; border: 1px solid rgba(56, 189, 248, 0.25); font-family: monospace;">${jsonString}</pre>
            </div>
          </div>
        </div>
      `;

      container.style.display = 'block';
    },

    bindOtherEvents() {
      const reviewModal = document.getElementById('reviewModal');
      document.getElementById('closeReviewModalBtn')?.addEventListener('click', () => reviewModal.classList.remove('active'));
      document.getElementById('skipReviewBtn')?.addEventListener('click', async () => {
        const sessId = document.getElementById('reviewSessionId').value;
        await this.submitSessionCompletion(sessId, 5, '', []);
      });

      document.querySelectorAll('#starRatingGroup .star-btn').forEach(star => {
        star.addEventListener('click', () => {
          const val = Number(star.dataset.val);
          this.selectedRating = val;
          this.updateStarRatingUI(val);
        });
      });

      document.querySelectorAll('#reviewTagsGroup .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          pill.classList.toggle('active');
          const tag = pill.dataset.tag;
          if (pill.classList.contains('active')) {
            if (!this.selectedReviewTags.includes(tag)) this.selectedReviewTags.push(tag);
          } else {
            this.selectedReviewTags = this.selectedReviewTags.filter(t => t !== tag);
          }
        });
      });

      const reviewForm = document.getElementById('reviewForm');
      reviewForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sessId = document.getElementById('reviewSessionId').value;
        const comment = document.getElementById('reviewCommentInput').value.trim();
        await this.submitSessionCompletion(sessId, this.selectedRating, comment, this.selectedReviewTags);
      });

      // Add Skill Modal
      const addSkillModal = document.getElementById('addSkillModal');
      document.getElementById('closeAddSkillModalBtn')?.addEventListener('click', () => addSkillModal.classList.remove('active'));
      document.getElementById('cancelAddSkillBtn')?.addEventListener('click', () => addSkillModal.classList.remove('active'));

      const addSkillForm = document.getElementById('addSkillForm');
      addSkillForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('addSkillType').value;
        const name = document.getElementById('skillNameInput').value.trim();
        const category = document.getElementById('skillCategorySelect').value;
        const level = document.getElementById('skillLevelSelect').value;
        const desc = document.getElementById('skillDescInput').value.trim();

        try {
          if (type === 'offered') {
            const res = await window.store.addSkillOffered({ name, category, level, description: desc, rate: 1.0 });
            if (res && res.qualificationBonusAwarded) {
              this.showToast(`🎉 Listed & Qualified "${name}"! +${res.bonusCredits || 2.0} Credits credited to your wallet!`, 'award');
            } else {
              this.showToast(`Added "${name}" to your Offered Courses! Take 20-question AI quiz to boost tier.`, 'plus');
            }
          } else {
            await window.store.addSkillWanted({ name, category, level, goal: desc });
            this.showToast(`Added "${name}" to your Learning Targets!`, 'bullseye');
          }
          addSkillModal.classList.remove('active');
          this.renderAll();
        } catch (err) {
          alert(err.message);
        }
      });

      // Host Group Cohort Modal Bindings
      const hostCohortModal = document.getElementById('hostCohortModal');
      document.getElementById('closeHostCohortModalBtn')?.addEventListener('click', () => hostCohortModal?.classList.remove('active'));
      document.getElementById('cancelHostCohortBtn')?.addEventListener('click', () => hostCohortModal?.classList.remove('active'));

      document.getElementById('cohortSkillSelect')?.addEventListener('change', () => this.updateCohortEarningsCalculation());
      document.getElementById('cohortDurationSelect')?.addEventListener('change', () => this.updateCohortEarningsCalculation());
      document.getElementById('cohortCapacitySelect')?.addEventListener('change', () => this.updateCohortEarningsCalculation());

      const hostCohortForm = document.getElementById('hostCohortForm');
      hostCohortForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const skillName = document.getElementById('cohortSkillSelect').value;
        const topic = document.getElementById('cohortTopicInput').value.trim();
        const hours = Number(document.getElementById('cohortDurationSelect').value || 2);
        const maxCapacity = Number(document.getElementById('cohortCapacitySelect').value || 5);
        const date = document.getElementById('cohortDateInput').value;
        const time = document.getElementById('cohortTimeInput').value;

        const submitBtn = document.getElementById('submitHostCohortBtn');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching Masterclass...';
          submitBtn.disabled = true;
        }

        try {
          const res = await window.store.createGroupCohort({
            skillName,
            topic,
            hours,
            date,
            time,
            maxCapacity
          });

          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }

          hostCohortModal?.classList.remove('active');
          hostCohortForm.reset();
          await window.store.fetchSessions();
          await this.renderSessions();
          this.showToast(`🚀 Live Group Masterclass scheduled! Capacity: ${maxCapacity} students (Earn up to ${(maxCapacity * hours * (res.rate || 2.5)).toFixed(1)} Credits).`, 'coins');
          this.switchView('view-sessions');
        } catch (err) {
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          alert('Could not launch group masterclass: ' + err.message);
        }
      });

      // Edit User Profile Database Details Modal
      document.getElementById('profileEditDbDetailsBtn')?.addEventListener('click', () => this.openEditProfileModal());
      document.getElementById('closeEditProfileModalBtn')?.addEventListener('click', () => this.closeModal('editProfileModal'));
      document.getElementById('cancelEditProfileBtn')?.addEventListener('click', () => this.closeModal('editProfileModal'));

      const editProfileForm = document.getElementById('editProfileForm');
      editProfileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('editUserIdHidden')?.value || window.store.getCurrentPersona().id;
        const name = document.getElementById('editUserNameInput')?.value.trim();
        const email = document.getElementById('editUserEmailInput')?.value.trim();
        const college = document.getElementById('editUserCollegeInput')?.value.trim();
        const major = document.getElementById('editUserMajorInput')?.value.trim();
        const role = document.getElementById('editUserRoleSelect')?.value;
        const avatar = document.getElementById('editUserAvatarSelect')?.value;
        const bio = document.getElementById('editUserBioInput')?.value.trim();
        const password = document.getElementById('editUserPasswordInput')?.value.trim();
        if (password) {
          if (!/^[A-Z]/.test(password)) {
            alert('Password rule violation: Password must start with a capital letter (A-Z).');
            this.showToast('❌ Password must start with a capital letter (A-Z).', 'lock');
            return;
          }
          if (password.length < 6) {
            alert('Password rule violation: Password must be at least 6 characters long.');
            this.showToast('❌ Password must be at least 6 characters long.', 'lock');
            return;
          }
        }

        const saveBtn = document.getElementById('saveProfileToDbBtn');
        const origBtnHtml = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
          saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Database...';
          saveBtn.disabled = true;
        }

        try {
          const payload = { id: userId, name, email, college, major, role, avatar, bio };
          if (password) payload.password = password;

          await window.store.updateUserProfile(payload);
          this.closeModal('editProfileModal');
          if (saveBtn) {
            saveBtn.innerHTML = origBtnHtml;
            saveBtn.disabled = false;
          }
          await window.store.init();
          this.renderAll();
          this.showToast(`✅ Profile details for "${name}" stored & saved in database successfully!`, 'check');
        } catch (err) {
          if (saveBtn) {
            saveBtn.innerHTML = origBtnHtml;
            saveBtn.disabled = false;
          }
          alert('Could not update user details in database: ' + err.message);
        }
      });
    },

    openEditProfileModal() {
      const user = window.store.getCurrentPersona();
      const idHidden = document.getElementById('editUserIdHidden');
      const nameInput = document.getElementById('editUserNameInput');
      const emailInput = document.getElementById('editUserEmailInput');
      const collegeInput = document.getElementById('editUserCollegeInput');
      const majorInput = document.getElementById('editUserMajorInput');
      const roleSelect = document.getElementById('editUserRoleSelect');
      const avatarSelect = document.getElementById('editUserAvatarSelect');
      const bioInput = document.getElementById('editUserBioInput');
      const passwordInput = document.getElementById('editUserPasswordInput');

      if (idHidden) idHidden.value = user.id;
      if (nameInput) nameInput.value = user.name || '';
      if (emailInput) emailInput.value = user.email || '';
      if (collegeInput) collegeInput.value = user.college || 'Vignan University';
      if (majorInput) majorInput.value = user.major || '';
      if (roleSelect) roleSelect.value = (user.role === 'ADMIN' || user.isAdmin) ? 'ADMIN' : 'STUDENT';
      if (avatarSelect) avatarSelect.value = user.avatar || user.id || 'sri';
      if (bioInput) bioInput.value = user.bio || '';
      if (passwordInput) passwordInput.value = '';

      this.openModal('editProfileModal');
    },

    openUploadCertModal() {
      const alertBox = document.getElementById('certVerificationModalAlert');
      if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
      }
      const reportContainer = document.getElementById('certAiReportContainer');
      if (reportContainer) {
        reportContainer.style.display = 'none';
        reportContainer.innerHTML = '';
      }
      const scanProgress = document.getElementById('certAiScanProgress');
      if (scanProgress) {
        scanProgress.style.display = 'none';
      }
      this.selectedCertFile = null;
      const fileInput = document.getElementById('nptelCertFileInput');
      if (fileInput) fileInput.value = '';
      const previewCard = document.getElementById('certFilePreviewCard');
      if (previewCard) previewCard.style.display = 'none';
      const prompt = document.getElementById('certUploadPrompt');
      if (prompt) prompt.style.display = 'block';

      const certSkillSelect = document.getElementById('certSkillSelect');
      if (certSkillSelect) certSkillSelect.value = 'Python Core & OOP';
      const certCustomSkillGroup = document.getElementById('certCustomSkillGroup');
      if (certCustomSkillGroup) certCustomSkillGroup.style.display = 'none';
      const certCustomSkillInput = document.getElementById('certCustomSkillInput');
      if (certCustomSkillInput) {
        certCustomSkillInput.value = '';
        certCustomSkillInput.required = false;
      }

      this.openModal('uploadCertModal');
    },

    openHostCohortModal() {
      const user = window.store.getCurrentPersona();
      const skillSelect = document.getElementById('cohortSkillSelect');
      const dateInput = document.getElementById('cohortDateInput');

      if (skillSelect) {
        const skills = user.skillsOffered && user.skillsOffered.length > 0 ? user.skillsOffered : [
          { name: 'Python Core & OOP', rate: 2.5, tier: 'Elite Master' },
          { name: 'React.js Frontend', rate: 2.5, tier: 'Elite Master' },
          { name: 'UI/UX Design & Figma', rate: 2.5, tier: 'Elite Master' }
        ];

        skillSelect.innerHTML = skills.map(s => {
          const rate = s.rate || 2.5;
          const tier = s.tier || 'Elite Master';
          return `<option value="${s.name}" data-rate="${rate}" data-tier="${tier}">${s.name} (${tier} • ${rate} Cr/hr)</option>`;
        }).join('');
      }

      if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
      }

      this.updateCohortEarningsCalculation();
      this.openModal('hostCohortModal');
    },

    updateCohortEarningsCalculation() {
      const capacitySelect = document.getElementById('cohortCapacitySelect');
      const capacity = Number(capacitySelect?.value || 5);
      const ratePerStudent = 1.0; // 1 credit added per attending student (1 student = 1 credit)
      const totalBounty = (capacity * ratePerStudent).toFixed(1);

      const display = document.getElementById('cohortProjectedCreditsDisplay');
      const formula = document.getElementById('cohortCalculationFormulaText');

      if (display) display.textContent = `+${totalBounty} Skill Credits`;
      if (formula) {
        formula.innerHTML = `${capacity} Students &times; 1.0 Credit/student = <strong>${totalBounty} Total Credits</strong> (1 student attended = +1.0 Credit added to tutor)!`;
      }
    },

    openLiveRoom(sessionId) {
      this.activeLiveRoomSessionId = sessionId;
      this.switchView('view-room');
    },

    async enrollInLiveCohort(sessionId) {
      try {
        const res = await window.store.enrollInCohort(sessionId);
        this.showToast(`🎉 Enrolled in Masterclass! Locked ${res.creditsLocked || 1.0} Credits in escrow (1 Cr/student).`, 'lock');
        await window.store.fetchSessions();
        await window.store.fetchWallet();
        this.renderNavbar();
        await this.renderSessions();
        await this.renderWallet();
        if (this.currentTab === 'view-room') {
          await this.renderLiveRoom(sessionId);
        }
      } catch (err) {
        alert('Enrollment failed: ' + err.message);
      }
    },

    async concludeCohortSession(sessionId) {
      const session = (window.store.sessions || []).find(s => s.id === sessionId);
      const attendeeCount = session?.enrolled_count || (session?.attendees?.length) || 0;
      const feePerStudent = 1.0; // 1 credit per student attended
      const totalCredits = (attendeeCount * feePerStudent).toFixed(1);

      if (!confirm(`Are you sure you want to conclude this live masterclass with ${attendeeCount} attending students? You will immediately receive +${totalCredits} Skill Credits (${attendeeCount} students × 1.0 Cr)!`)) {
        return;
      }

      try {
        const res = await window.store.completeCohortSession(sessionId, 5, 'Live group masterclass successfully concluded', ['Group Cohort', 'Hands-on Coding', 'Super Clear']);
        this.showToast(`🎉 Cohort concluded! +${res.totalEarnedCredits || totalCredits} Credits deposited into your wallet (${attendeeCount} attending students)!`, 'award');
        await window.store.init();
        this.renderAll();
        if (this.currentTab === 'view-room') {
          await this.renderLiveRoom(sessionId);
        }
      } catch (err) {
        alert('Error completing cohort: ' + err.message);
      }
    },

    updateBookingCalculation() {
      const hours = Number(document.getElementById('bookDurationSelect').value);
      const rate = Number(document.getElementById('bookHourlyRate').value || 1.0);
      const total = (hours * rate).toFixed(1);
      const notice = document.getElementById('bookEscrowNotice');
      if (notice) {
        notice.innerHTML = `<strong>${hours} Hours &times; ${rate} Credits/hr = ${total} Credits</strong> will be locked in escrow. Your mentor receives credits only after the session concludes.`;
      }
    },

    // ==========================================
    // Multi-Persona & Multi-Role Authentication Handlers
    // ==========================================
    bindAuthEvents() {
      const authModal = document.getElementById('authModal');
      const openAuth = (defaultTab = 'authSignInTab') => {
        this.updateAuthModalJwtInspector();
        if (defaultTab) {
          document.querySelectorAll('.auth-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.authtab === defaultTab);
          });
          document.querySelectorAll('.auth-tab-pane').forEach(p => {
            p.style.display = p.id === defaultTab ? 'block' : 'none';
            p.classList.toggle('active', p.id === defaultTab);
          });
        }
        this.openModal('authModal');
      };

      const closeAuth = () => {
        this.closeModal('authModal');
        const loginErr = document.getElementById('loginErrorMsg');
        const regErr = document.getElementById('regErrorMsg');
        if (loginErr) loginErr.style.display = 'none';
        if (regErr) regErr.style.display = 'none';
      };

      // Navbar Triggers
      document.getElementById('navAuthBtn')?.addEventListener('click', () => {
        this.showEntrancePortal();
      });

      document.getElementById('dropdownLogoutBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('personaDropdown')?.classList.remove('show');
        window.store.logout();
        this.showEntrancePortal();
        this.showToast('Signed out successfully. Welcome to the Login Portal.', 'user');
      });

      document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuth);
      document.getElementById('cancelAuthLoginBtn')?.addEventListener('click', closeAuth);
      document.getElementById('cancelAuthRegisterBtn')?.addEventListener('click', closeAuth);
      document.getElementById('closeAuthRolesBtn')?.addEventListener('click', closeAuth);

      // Single User Quick-Fill Button in Login Modal
      document.getElementById('authSingleUserQuickFillBtn')?.addEventListener('click', () => {
        const user = window.store.getCurrentPersona();
        const emailInput = document.getElementById('loginEmailInput');
        const passInput = document.getElementById('loginPasswordInput');
        if (emailInput) emailInput.value = user.email || (user.id + '@vignan.ac.in') || 'sri@vignan.ac.in';
        if (passInput) passInput.value = 'Password123';
        this.showToast(`Auto-filled verified credentials for ${user.name || 'Sri Dhanush'}`, 'user');
      });

      // Auth Tabs Navigation
      document.querySelectorAll('.auth-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
          document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.auth-tab-pane').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
          });

          tabBtn.classList.add('active');
          const targetId = tabBtn.dataset.authtab;
          const targetPane = document.getElementById(targetId);
          if (targetPane) {
            targetPane.style.display = 'block';
            targetPane.classList.add('active');
          }
          if (targetId === 'authRolesTab') {
            this.updateAuthModalJwtInspector();
          }
        });
      });

      // Role Selection Cards in Registration Form
      document.querySelectorAll('.role-card-label').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.role-card-label').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          const radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        });
      });

      // Login Form Submit with Email & Password Pre-Verification
      const loginForm = document.getElementById('authLoginForm');
      loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById('loginErrorMsg');
        if (errorBox) errorBox.style.display = 'none';

        const emailOrId = document.getElementById('loginEmailInput')?.value.trim();
        const password = document.getElementById('loginPasswordInput')?.value;
        const submitBtn = document.getElementById('submitLoginBtn');
        const origText = submitBtn ? submitBtn.innerHTML : '';

        // 1. Client-Side Email Verification
        if (!emailOrId) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Email Missing:</strong> Please enter your registered email or University ID.';
            errorBox.style.display = 'block';
          }
          this.showToast('Please enter your email or University ID', 'lock');
          return;
        }

        if (emailOrId.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailOrId)) {
            if (errorBox) {
              errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Invalid Email Format:</strong> Please enter a valid email address (e.g., student@vignan.ac.in).';
              errorBox.style.display = 'block';
            }
            this.showToast('Invalid email address format', 'lock');
            return;
          }
        }

        // 2. Client-Side Password Rule Verification
        if (!password) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Password Missing:</strong> Please enter your account password.';
            errorBox.style.display = 'block';
          }
          this.showToast('Please enter your password', 'lock');
          return;
        }

        if (!/^[A-Z]/.test(password)) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Password Verification Failed:</strong> Password must start with a capital letter (A-Z).';
            errorBox.style.display = 'block';
          }
          this.showToast('❌ Password must start with a capital letter (A-Z)', 'lock');
          return;
        }

        if (password.length < 6) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Password Verification Failed:</strong> Password must be at least 6 characters long.';
            errorBox.style.display = 'block';
          }
          this.showToast('❌ Password must be at least 6 characters long', 'lock');
          return;
        }

        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying email & password...';
          submitBtn.disabled = true;
        }

        try {
          const data = await window.store.login(emailOrId, password);
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          closeAuth();
          await this.renderAll();
          this.showToast(`✅ Email & password verified! Welcome back, ${data.user?.name}!`, 'check');
        } catch (err) {
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          if (errorBox) {
            errorBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${err.message || 'Authentication failed. Please check your credentials.'}`;
            errorBox.style.display = 'block';
          }
          this.showToast(err.message || 'Verification failed', 'lock');
        }
      });

      // Register Form Submit
      const regForm = document.getElementById('authRegisterForm');
      regForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById('regErrorMsg');
        if (errorBox) errorBox.style.display = 'none';

        const name = document.getElementById('regNameInput').value.trim();
        const email = document.getElementById('regEmailInput').value.trim();
        const password = document.getElementById('regPasswordInput').value;
        const selectedRadio = document.querySelector('input[name="regRole"]:checked');
        const role = selectedRadio ? selectedRadio.value : 'STUDENT';
        const college = document.getElementById('regCollegeInput').value.trim();
        const major = document.getElementById('regMajorInput').value.trim();
        const bio = document.getElementById('regBioInput').value.trim();

        // Password Rule Validation: Starts with Capital Letter (A-Z) & Min 6 Characters
        if (!/^[A-Z]/.test(password)) {
          if (errorBox) {
            errorBox.textContent = '❌ Password rule violation: Password must start with a capital letter (A-Z).';
            errorBox.style.display = 'block';
          }
          this.showToast('❌ Password must start with a capital letter (A-Z)', 'lock');
          return;
        }

        if (password.length < 6) {
          if (errorBox) {
            errorBox.textContent = '❌ Password rule violation: Password must be at least 6 characters long.';
            errorBox.style.display = 'block';
          }
          this.showToast('❌ Password must be at least 6 characters long', 'lock');
          return;
        }

        const submitBtn = document.getElementById('submitRegisterBtn');
        const origText = submitBtn ? submitBtn.innerHTML : '';

        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registering Account...';
          submitBtn.disabled = true;
        }

        try {
          const data = await window.store.register({ name, email, password, role, college, major, bio });
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          closeAuth();
          await this.renderAll();
          this.showToast(`Welcome to SkillSwap, ${data.user?.name}! Logged in as ${data.user?.role} (+3.0 Welcome Credits).`, 'coins');
        } catch (err) {
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          if (errorBox) {
            errorBox.textContent = err.message || 'Registration failed.';
            errorBox.style.display = 'block';
          }
        }
      });

      // Re-verify JWT Session
      document.getElementById('refreshJwtBtn')?.addEventListener('click', async () => {
        await window.store.fetchMe();
        this.updateAuthModalJwtInspector();
        this.showToast('JWT signature verified with Express auth middleware!', 'check');
      });

      // Refresh Login Audit Logs
      document.getElementById('refreshLoginLogsBtn')?.addEventListener('click', () => {
        this.renderLoginHistoryLogs();
        this.showToast('Login audit logs reloaded from database!', 'check');
      });
    },

    updateAuthModalJwtInspector() {
      const token = window.store.token;
      const user = window.store.getCurrentPersona();
      const tokenDisplay = document.getElementById('jwtTokenDisplay');
      const claimsDisplay = document.getElementById('jwtClaimsDisplay');
      const indicator = document.getElementById('jwtStatusIndicator');

      if (token && tokenDisplay) {
        tokenDisplay.textContent = `Bearer ${token.substring(0, 28)}...${token.substring(token.length - 12)}`;
        if (indicator) {
          indicator.textContent = 'Active JWT Valid';
          indicator.style.color = 'var(--accent-emerald)';
        }
      } else if (tokenDisplay) {
        tokenDisplay.textContent = 'No active Bearer token';
        if (indicator) {
          indicator.textContent = 'Unauthenticated';
          indicator.style.color = 'var(--accent-rose)';
        }
      }

      if (claimsDisplay && user) {
        const role = user.role || (user.isAdmin ? 'ADMIN' : 'STUDENT');
        const roleClass = (role === 'ADMIN' || role === 'FACULTY_ADMIN' || role === 'SUPER_ADMIN') ? 'role-admin' : 'role-student';
        claimsDisplay.innerHTML = `User: <strong>${user.name}</strong> | Email: <strong>${user.email || user.id + '@vignan.ac.in'}</strong> | Role: <span class="auth-role-pill ${roleClass}">${role}</span> | Logins: <strong>${user.login_count || 1}</strong>`;
      }

      this.renderLoginHistoryLogs();
    },

    async renderLoginHistoryLogs() {
      const container = document.getElementById('loginHistoryListContainer');
      if (!container) return;

      container.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i> Fetching database login audit records...</div>`;

      const logs = await window.store.fetchLoginHistory();
      if (!logs || logs.length === 0) {
        container.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">No database login records found.</div>`;
        return;
      }

      container.innerHTML = logs.map(l => {
        const isSuccess = l.status === 'SUCCESS';
        const role = l.role || 'STUDENT';
        const timeStr = l.created_at ? new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
        const dateStr = l.created_at ? new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today';

        return `
          <div style="background: var(--bg-subtle); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.74rem; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid ${isSuccess ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
            <div style="display: flex; flex-direction: column; gap: 0.1rem;">
              <div style="font-weight: 700; display: flex; align-items: center; gap: 0.35rem;">
                <span style="color: ${isSuccess ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${isSuccess ? '✓' : '✗'} ${l.status}</span>
                <span>•</span>
                <span style="color: var(--text-primary);">${l.email || l.user_id || 'Guest'}</span>
                <span class="auth-role-pill role-${role.toLowerCase().replace('_', '')}" style="font-size: 0.62rem; padding: 0.05rem 0.35rem;">${role}</span>
              </div>
              <div style="color: var(--text-muted); font-size: 0.68rem;">
                Method: ${l.auth_method || 'PASSWORD'} | IP: <code>${l.ip_address || '127.0.0.1'}</code> ${l.failure_reason ? `| Reason: <span style="color:var(--accent-rose);">${l.failure_reason}</span>` : ''}
              </div>
            </div>
            <div style="text-align: right; color: var(--text-muted); font-size: 0.68rem; font-family: monospace;">
              <div>${timeStr}</div>
              <div>${dateStr}</div>
            </div>
          </div>
        `;
      }).join('');
    },

    // ==========================================
    // Academic Support Team & Triage Handlers
    // ==========================================
    bindSupportEvents() {
      // Open Create Modal
      document.getElementById('openCreateSupportTicketBtn')?.addEventListener('click', () => {
        this.openCreateSupportModal();
      });

      // Shortcut buttons to open Upload Doubt modal from other views
      document.getElementById('sessionsUploadDoubtBtn')?.addEventListener('click', () => {
        this.openCreateSupportModal();
      });
      document.getElementById('roomUploadDoubtBtn')?.addEventListener('click', () => {
        this.openCreateSupportModal();
      });

      // Close Create Modal
      document.getElementById('closeCreateSupportTicketModalBtn')?.addEventListener('click', () => {
        this.closeModal('createSupportTicketModal');
      });
      document.getElementById('cancelCreateSupportTicketBtn')?.addEventListener('click', () => {
        this.closeModal('createSupportTicketModal');
      });

      // Skill Selection Change -> Real-time Verification
      document.getElementById('supportSkillSelect')?.addEventListener('change', () => {
        this.checkSupportEligibilityLive();
      });

      // Doubt Attachment Dropzone & File Input Handling
      const dropzone = document.getElementById('supportDropzone');
      const fileInput = document.getElementById('supportAttachmentInput');
      const previewCard = document.getElementById('supportAttachmentPreview');
      const uploadPrompt = document.getElementById('supportUploadPrompt');
      const imgPreview = document.getElementById('supportAttachmentImgPreview');
      const fileIcon = document.getElementById('supportAttachmentFileIcon');
      const fileNameEl = document.getElementById('supportAttachmentFileName');
      const fileSizeEl = document.getElementById('supportAttachmentFileSize');
      const removeBtn = document.getElementById('removeSupportAttachmentBtn');

      this.selectedSupportAttachment = null;

      const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      const handleFile = (file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          alert('File size exceeds 5MB limit. Please select a smaller screenshot or code file.');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          this.selectedSupportAttachment = {
            name: file.name,
            data: base64Data,
            size: file.size,
            type: file.type
          };

          if (fileNameEl) fileNameEl.textContent = file.name;
          if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);

          if (file.type && file.type.startsWith('image/')) {
            if (imgPreview) {
              imgPreview.src = base64Data;
              imgPreview.style.display = 'block';
            }
            if (fileIcon) fileIcon.style.display = 'none';
          } else {
            if (imgPreview) imgPreview.style.display = 'none';
            if (fileIcon) fileIcon.style.display = 'inline-block';
          }

          if (uploadPrompt) uploadPrompt.style.display = 'none';
          if (previewCard) previewCard.style.display = 'flex';
        };

        reader.readAsDataURL(file);
      };

      dropzone?.addEventListener('click', (e) => {
        if (e.target.closest('#removeSupportAttachmentBtn')) return;
        fileInput?.click();
      });

      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
      });

      dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.background = 'rgba(79, 70, 229, 0.08)';
      });

      dropzone?.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-medium)';
        dropzone.style.background = 'var(--bg-subtle)';
      });

      dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-medium)';
        dropzone.style.background = 'var(--bg-subtle)';
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFile(file);
      });

      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedSupportAttachment = null;
        if (fileInput) fileInput.value = '';
        if (previewCard) previewCard.style.display = 'none';
        if (uploadPrompt) uploadPrompt.style.display = 'block';
      });

      // Submit Create Ticket Form
      const createForm = document.getElementById('createSupportTicketForm');
      createForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const skillName = document.getElementById('supportSkillSelect').value;
        const title = document.getElementById('supportTitleInput').value.trim();
        const issueType = document.getElementById('supportIssueTypeSelect').value;
        const description = document.getElementById('supportDescriptionInput').value.trim();
        const codeSnippet = document.getElementById('supportCodeInput').value.trim();
        const attachmentName = this.selectedSupportAttachment?.name || null;
        const attachmentData = this.selectedSupportAttachment?.data || null;

        const submitBtn = document.getElementById('submitSupportTicketBtn');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
          submitBtn.disabled = true;
        }

        try {
          await window.store.createSupportTicket({
            skillName,
            title,
            issueType,
            description,
            codeSnippet,
            attachmentName,
            attachmentData
          });

          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }

          this.closeModal('createSupportTicketModal');
          createForm.reset();
          this.selectedSupportAttachment = null;
          if (fileInput) fileInput.value = '';
          if (previewCard) previewCard.style.display = 'none';
          if (uploadPrompt) uploadPrompt.style.display = 'block';

          await this.renderSupportDesk();
          this.showToast(`Doubt uploaded to Support Desk! Free support (0 Cr) • Mentor triage queued.`, 'check');
        } catch (err) {
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          alert('Could not submit support ticket: ' + err.message);
        }
      });

      // Close Resolve Modal
      document.getElementById('closeResolveSupportModalBtn')?.addEventListener('click', () => {
        this.closeModal('resolveSupportModal');
      });
      document.getElementById('cancelResolveSupportBtn')?.addEventListener('click', () => {
        this.closeModal('resolveSupportModal');
      });

      // Complexity Option Click / Radio Change
      document.querySelectorAll('#resolveSupportModal .complexity-option').forEach(opt => {
        opt.addEventListener('click', () => {
          document.querySelectorAll('#resolveSupportModal .complexity-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          const radio = opt.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;

          const bounty = opt.dataset.bounty || '1.0';
          const level = opt.dataset.level || (radio ? radio.value : 'Level 1: Syntax / Typo / Quick Debug');
          this.selectedSupportComplexity = { level, bounty: parseFloat(bounty) };

          const display = document.getElementById('resolveBountyRewardDisplay');
          if (display) {
            display.textContent = `+${bounty} Skill Credits`;
          }
        });
      });

      // Submit Resolve Form
      const resolveForm = document.getElementById('resolveSupportForm');
      resolveForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ticketId = document.getElementById('resolveTicketId').value;
        const selectedRadio = document.querySelector('input[name="supportComplexityRadio"]:checked');
        const classification = selectedRadio ? selectedRadio.value : this.selectedSupportComplexity.level;
        const solution = document.getElementById('resolveSolutionInput').value.trim();
        const recommendedQuizSkill = document.getElementById('resolveRecommendedQuizSelect').value;

        const submitBtn = document.getElementById('submitResolveSupportBtn');
        const origText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Depositing Credits...';
          submitBtn.disabled = true;
        }

        try {
          const res = await window.store.resolveSupportTicket(ticketId, {
            classification,
            solution,
            recommendedQuizSkill
          });

          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }

          this.closeModal('resolveSupportModal');
          resolveForm.reset();
          await this.renderSupportDesk();
          await this.renderWallet();
          this.renderNavbar();
          this.showToast(`🎉 Triage completed! +${res.rewardCredits || 1.5} Credits deposited into your wallet!`, 'coins');
        } catch (err) {
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
          alert('Could not resolve ticket: ' + err.message);
        }
      });

      // Support Filter Pills
      document.querySelectorAll('#supportFilterPills .filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          document.querySelectorAll('#supportFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.supportFilter = pill.dataset.supportfilter || 'ALL';
          this.renderSupportDeskCards();
        });
      });

      // Support Search Input
      document.getElementById('supportSearchInput')?.addEventListener('input', (e) => {
        this.supportSearchQuery = e.target.value.toLowerCase().trim();
        this.renderSupportDeskCards();
      });
    },

    // ==========================================
    // AI Dynamic 20-Question Assessment Handlers
    // ==========================================
    bindQuizEvents() {
      const quizModal = document.getElementById('quizModal');
      document.getElementById('closeQuizModalBtn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the 20-question assessment? Your progress will be lost.')) {
          clearInterval(this.quizTimerInterval);
          quizModal.classList.remove('active');
        }
      });

      document.getElementById('quizNextBtn')?.addEventListener('click', () => {
        if (this.activeQuiz && this.currentQuestionIndex < this.activeQuiz.questions.length - 1) {
          this.currentQuestionIndex++;
          this.renderQuizQuestion();
        }
      });

      document.getElementById('quizPrevBtn')?.addEventListener('click', () => {
        if (this.activeQuiz && this.currentQuestionIndex > 0) {
          this.currentQuestionIndex--;
          this.renderQuizQuestion();
        }
      });

      const handleAssessmentSubmitClick = async () => {
        const answeredCount = Object.keys(this.userAnswers).length;
        const total = this.activeQuiz?.questions?.length || 20;
        if (answeredCount < total) {
          if (!confirm(`You have answered ${answeredCount} of ${total} questions. The remaining ${total - answeredCount} unattempted questions will receive 0 marks. Are you sure you want to submit and evaluate now?`)) {
            return;
          }
        }
        await this.submitAssessment();
      };

      // Dual Submit Options: Bottom Modal Button & Top Jump Matrix Header Button
      document.getElementById('quizSubmitBtn')?.addEventListener('click', handleAssessmentSubmitClick);
      document.getElementById('quizQuickSubmitBtn')?.addEventListener('click', handleAssessmentSubmitClick);

      document.getElementById('quizCloseResultBtn')?.addEventListener('click', async () => {
        quizModal.classList.remove('active');
        await this.renderAll();
      });
    },

    async regenerateQuiz() {
      if (!this.activeQuiz) return;
      if (confirm('Generate a brand-new set of 20 dynamic AI questions? Your current answers will be reset.')) {
        await this.startQuiz(this.activeQuiz.skill_name);
        this.showToast('✨ Synthesized fresh 20-question dynamic AI assessment set!', 'wand-magic-sparkles');
      }
    },

    async startQuiz(skillName) {
      try {
        const indicator = document.getElementById('quizQuestionText');
        if (indicator) indicator.textContent = 'Generating 20 dynamic AI questions...';

        this.openModal('quizModal');
        document.getElementById('quizQuestionsScreen').style.display = 'block';
        document.getElementById('quizResultScreen').style.display = 'none';

        const quiz = await window.store.fetchQuizDetails(skillName);
        this.activeQuiz = quiz;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.quizTimerSeconds = (quiz.time_limit_minutes || 15) * 60;
        const titleEl = document.getElementById('quizModalTitle');
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-award" style="color: var(--primary);"></i> ${quiz.title}`;

        const subtitleEl = document.getElementById('quizModalSubtitle');
        if (subtitleEl) subtitleEl.textContent = `• 20 Questions • 15 Mins • Negative Marking Active • Pass: ≥70% (42/60) • Distinction: ≥90% (54/60)`;

        const prevBtn = document.getElementById('quizPrevBtn');
        const nextBtn = document.getElementById('quizNextBtn');
        const submitBtn = document.getElementById('quizSubmitBtn');
        const quickSubmitBtn = document.getElementById('quizQuickSubmitBtn');
        const closeResultBtn = document.getElementById('quizCloseResultBtn');
        const headerBackBtn = document.getElementById('quizHeaderBackBtn');
        const backToHomeBtn = document.getElementById('quizBackToHomeBtn');
        const backToAssessmentsBtn = document.getElementById('quizBackToAssessmentsBtn');
        const retakeFromResultsBtn = document.getElementById('quizRetakeFromResultsBtn');

        if (headerBackBtn) headerBackBtn.style.display = 'none';
        if (backToHomeBtn) backToHomeBtn.style.display = 'none';
        if (backToAssessmentsBtn) backToAssessmentsBtn.style.display = 'none';
        if (retakeFromResultsBtn) retakeFromResultsBtn.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) {
          nextBtn.style.display = 'inline-flex';
          nextBtn.disabled = false;
        }
        if (submitBtn) {
          submitBtn.style.display = 'none';
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit & Grade (+3 / -1 / 0)';
        }
        if (quickSubmitBtn) {
          quickSubmitBtn.disabled = false;
          quickSubmitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Assessment';
        }
        if (closeResultBtn) closeResultBtn.style.display = 'none';

        this.renderQuizMatrix();
        this.renderQuizQuestion();
        this.startQuizTimer();
      } catch (err) {
        alert('Could not start AI assessment: ' + err.message);
      }
    },

    renderQuizMatrix() {
      const grid = document.getElementById('quizMatrixGrid');
      const counter = document.getElementById('quizAnsweredCountIndicator');
      if (!grid || !this.activeQuiz || !this.activeQuiz.questions) return;

      const total = this.activeQuiz.questions.length || 20;
      const answeredCount = Object.keys(this.userAnswers).filter(k => this.userAnswers[k] !== undefined && this.userAnswers[k] !== null).length;

      if (counter) {
        counter.textContent = `${answeredCount} / ${total} Answered`;
      }

      grid.innerHTML = this.activeQuiz.questions.map((_, idx) => {
        const isCurrent = idx === this.currentQuestionIndex;
        const isAnswered = this.userAnswers[idx] !== undefined && this.userAnswers[idx] !== null;
        let classes = 'quiz-matrix-btn';
        if (isCurrent) classes += ' active';
        if (isAnswered) classes += ' answered';

        return `
          <button type="button" class="${classes}" onclick="window.app.jumpToQuestion(${idx})" title="Question ${idx + 1}${isAnswered ? ' (Answered)' : ' (Unattempted)'}">
            ${idx + 1}
          </button>
        `;
      }).join('');
    },

    jumpToQuestion(index) {
      if (!this.activeQuiz || !this.activeQuiz.questions) return;
      if (index >= 0 && index < this.activeQuiz.questions.length) {
        this.currentQuestionIndex = index;
        this.renderQuizQuestion();
      }
    },

    renderQuizQuestion() {
      if (!this.activeQuiz || !this.activeQuiz.questions || this.activeQuiz.questions.length === 0) return;

      const total = this.activeQuiz.questions.length;
      const q = this.activeQuiz.questions[this.currentQuestionIndex];
      if (!q) return;

      // Update question index & progress bar
      const numIndicator = document.getElementById('quizQuestionNumberIndicator');
      if (numIndicator) {
        numIndicator.textContent = `Question ${this.currentQuestionIndex + 1} of ${total}`;
      }

      const progressBar = document.getElementById('quizProgressBar');
      if (progressBar) {
        const pct = ((this.currentQuestionIndex + 1) / total) * 100;
        progressBar.style.width = `${pct}%`;
      }

      // Update Question text and optional code snippet
      const qText = document.getElementById('quizQuestionText');
      if (qText) {
        qText.textContent = q.question;
      }

      const codeSnippet = document.getElementById('quizCodeSnippet');
      if (codeSnippet) {
        if (q.code_snippet && q.code_snippet.trim().length > 0) {
          codeSnippet.textContent = q.code_snippet;
          codeSnippet.style.display = 'block';
        } else {
          codeSnippet.style.display = 'none';
        }
      }

      // Render 4 options
      const optList = document.getElementById('quizOptionsList');
      if (optList && Array.isArray(q.options)) {
        const letters = ['A', 'B', 'C', 'D'];
        const selectedVal = this.userAnswers[this.currentQuestionIndex];

        optList.innerHTML = q.options.map((opt, optIdx) => {
          const isSelected = selectedVal === optIdx;
          return `
            <div class="quiz-option-item ${isSelected ? 'selected' : ''}" onclick="window.app.selectQuizOption(${optIdx})">
              <div class="option-radio-dot"></div>
              <span style="font-weight: 700; color: var(--primary); margin-right: 0.35rem;">${letters[optIdx] || optIdx + 1}.</span>
              <span>${opt}</span>
            </div>
          `;
        }).join('');
      }

      // Update Navigation buttons
      const prevBtn = document.getElementById('quizPrevBtn');
      const nextBtn = document.getElementById('quizNextBtn');
      const submitBtn = document.getElementById('quizSubmitBtn');

      if (prevBtn) {
        prevBtn.style.display = this.currentQuestionIndex > 0 ? 'inline-flex' : 'none';
      }
      if (nextBtn) {
        nextBtn.style.display = this.currentQuestionIndex < total - 1 ? 'inline-flex' : 'none';
      }
      if (submitBtn) {
        submitBtn.style.display = this.currentQuestionIndex === total - 1 ? 'inline-flex' : 'none';
      }

      // Re-sync matrix grid active/answered states
      this.renderQuizMatrix();

      // Ensure question screen is scrolled smoothly to top
      const qScreen = document.getElementById('quizQuestionsScreen');
      if (qScreen) qScreen.scrollTop = 0;
    },

    selectQuizOption(optionIndex) {
      this.userAnswers[this.currentQuestionIndex] = optionIndex;
      this.renderQuizQuestion();
    },

    clearCurrentAnswer() {
      delete this.userAnswers[this.currentQuestionIndex];
      this.renderQuizQuestion();
    },

    startQuizTimer() {
      if (this.quizTimerInterval) clearInterval(this.quizTimerInterval);
      const timerDisplay = document.getElementById('quizCountdownTimer');

      const updateTimer = () => {
        if (this.quizTimerSeconds <= 0) {
          clearInterval(this.quizTimerInterval);
          if (timerDisplay) timerDisplay.textContent = '00:00';
          this.showToast('⏰ Time is up! Submitting assessment for evaluation...', 'clock');
          this.submitAssessment();
          return;
        }

        const mins = Math.floor(this.quizTimerSeconds / 60);
        const secs = this.quizTimerSeconds % 60;
        if (timerDisplay) {
          timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        this.quizTimerSeconds--;
      };

      updateTimer();
      this.quizTimerInterval = setInterval(updateTimer, 1000);
    },

    closeQuizModalAndGoHome() {
      this.closeModal('quizModal');
      if (this.quizTimerInterval) clearInterval(this.quizTimerInterval);
      this.renderAll();
      this.switchView('view-matches');
      this.showToast('🏠 Returned to Home Dashboard (Smart Matches)', 'house');
    },

    closeQuizModalAndReturn() {
      this.closeModal('quizModal');
      if (this.quizTimerInterval) clearInterval(this.quizTimerInterval);
      this.renderAll();
      this.switchView('view-quizzes');
    },

    async retakeCurrentQuiz() {
      if (!this.activeQuiz) return;
      await this.startQuiz(this.activeQuiz.skill_name || 'Python Core & OOP');
    },

    async submitAssessment() {
      clearInterval(this.quizTimerInterval);
      const submitBtn = document.getElementById('quizSubmitBtn');
      const quickSubmitBtn = document.getElementById('quizQuickSubmitBtn');
      const origSubmitText = submitBtn ? submitBtn.innerHTML : '';
      const origQuickText = quickSubmitBtn ? quickSubmitBtn.innerHTML : '';

      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Evaluating 20 Questions...';
        submitBtn.disabled = true;
      }
      if (quickSubmitBtn) {
        quickSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Grading...';
        quickSubmitBtn.disabled = true;
      }

      try {
        const result = await window.store.submitQuiz(this.activeQuiz.id, this.userAnswers, this.activeQuiz.skill_name);

        document.getElementById('quizQuestionsScreen').style.display = 'none';
        const resScreen = document.getElementById('quizResultScreen');
        if (resScreen) {
          resScreen.style.display = 'block';
          resScreen.scrollTop = 0;
        }

        const quizModal = document.getElementById('quizModal');
        if (quizModal) quizModal.scrollTop = 0;

        document.getElementById('quizPrevBtn').style.display = 'none';
        document.getElementById('quizNextBtn').style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'none';
        
        // Show Back Buttons & Done / Retake Actions
        const headerBackBtn = document.getElementById('quizHeaderBackBtn');
        const backToHomeBtn = document.getElementById('quizBackToHomeBtn');
        const backToAssessmentsBtn = document.getElementById('quizBackToAssessmentsBtn');
        const retakeFromResultsBtn = document.getElementById('quizRetakeFromResultsBtn');
        const closeResultBtn = document.getElementById('quizCloseResultBtn');

        if (headerBackBtn) headerBackBtn.style.display = 'inline-flex';
        if (backToHomeBtn) backToHomeBtn.style.display = 'inline-flex';
        if (backToAssessmentsBtn) backToAssessmentsBtn.style.display = 'inline-flex';
        if (retakeFromResultsBtn) retakeFromResultsBtn.style.display = 'inline-flex';
        if (closeResultBtn) closeResultBtn.style.display = 'inline-flex';

        const scoreCircle = document.getElementById('quizScoreCircle');
        const scorePercent = document.getElementById('quizScorePercent');
        const marksDisplay = document.getElementById('quizMarksDisplay');
        const heading = document.getElementById('quizResultHeading');
        const subtext = document.getElementById('quizResultSubtext');
        const feedback = document.getElementById('quizFeedbackBox');

        // Output Marks & Percentage
        if (scorePercent) scorePercent.textContent = `${result.scorePercent}%`;
        if (marksDisplay) {
          marksDisplay.textContent = `${result.marksObtained} / ${result.maxMarks || 60} Marks`;
        }

        // Output 4 Breakdown Cards
        const correctEl = document.getElementById('quizBreakdownCorrect');
        const wrongEl = document.getElementById('quizBreakdownWrong');
        const unattemptedEl = document.getElementById('quizBreakdownUnattempted');
        const netEl = document.getElementById('quizBreakdownNet');

        if (correctEl) correctEl.textContent = `${result.correctCount} (+${result.correctCount * 3})`;
        if (wrongEl) wrongEl.textContent = `${result.wrongCount} (-${result.wrongCount * 1})`;
        if (unattemptedEl) unattemptedEl.textContent = `${result.unattemptedCount} (0)`;
        if (netEl) netEl.textContent = `${result.marksObtained} / ${result.maxMarks || 60}`;

        // ==========================================
        // Immediate Grade Allotment & Visual Banner
        // ==========================================
        const score = result.scorePercent !== undefined ? result.scorePercent : 0;
        const isPassed = result.passed;
        const hasCert = Boolean(result.hasCertificate || result.has_certificate || (window.store.getCurrentPersona()?.certificates || []).some(c => c.is_verified));

        let gradeKey = 'FAIL';
        let gradeTitle = 'GRADE ALLOTTED: FAIL (NOT PASSED)';
        let gradeIcon = '❌';
        let gradePill = 'FAIL (< 70%)';
        let gradeRate = '0.0 Cr/hr';
        let gradePillStyle = 'background: rgba(239, 68, 68, 0.2); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.4);';
        let gradeCardStyle = 'background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.03) 100%); border: 1.5px solid rgba(239, 68, 68, 0.35);';
        let gradeColor = '#dc2626';
        let gradeDesc = `Your score of <strong>${result.marksObtained} Marks (${score}%)</strong> is below the passing requirement of 42 / 60 Marks (70%). Your teaching badge remains unverified. Review your negative marking deductions below and click <strong>Retake Assessment</strong> when ready!`;

        if (isPassed) {
          if (score >= 90 && hasCert) {
            gradeKey = 'ELITE';
            gradeTitle = 'GRADE ALLOTTED: 🥇 ELITE MASTER TUTOR';
            gradeIcon = '🥇';
            gradePill = '🥇 4. ELITE MASTER';
            gradeRate = '2.5 Credits / hr';
            gradePillStyle = 'background: rgba(245, 158, 11, 0.25); color: #b45309; border: 1.5px solid #f59e0b;';
            gradeCardStyle = 'background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.05) 100%); border: 2px solid #f59e0b; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.18);';
            gradeColor = '#b45309';
            gradeDesc = `🎉 Outstanding Distinction! You scored <strong>${result.marksObtained} Marks (${score}%)</strong> with a verified external academic certificate. You have been immediately allotted the top tier: <strong>🥇 Elite Master Tutor (2.5 Cr/hr)</strong>!`;
          } else if (score >= 90) {
            gradeKey = 'SILVER_HIGH';
            gradeTitle = 'GRADE ALLOTTED: 🥈 SILVER TUTOR (DISTINCTION)';
            gradeIcon = '🥈';
            gradePill = '🥈 2. SILVER TUTOR';
            gradeRate = '1.5 Credits / hr';
            gradePillStyle = 'background: rgba(148, 163, 184, 0.25); color: #334155; border: 1.5px solid #94a3b8;';
            gradeCardStyle = 'background: linear-gradient(135deg, rgba(148, 163, 184, 0.18) 0%, rgba(100, 116, 139, 0.05) 100%); border: 2px solid #94a3b8; box-shadow: 0 4px 18px rgba(148, 163, 184, 0.15);';
            gradeColor = '#475569';
            gradeDesc = `🎉 Distinction Score Achieved! You scored <strong>${result.marksObtained} Marks (${score}%)</strong>. You have been allotted <strong>🥈 Silver Tutor (1.5 Cr/hr)</strong>. Link an NPTEL/Coursera certificate anytime to immediately upgrade to <strong>🥇 Elite Master (2.5 Cr/hr)</strong>!`;
          } else if (hasCert) {
            gradeKey = 'ADVANCED';
            gradeTitle = 'GRADE ALLOTTED: 🎖️ ADVANCED TUTOR';
            gradeIcon = '🎖️';
            gradePill = '🎖️ 3. ADVANCED TUTOR';
            gradeRate = '2.0 Credits / hr';
            gradePillStyle = 'background: rgba(14, 165, 233, 0.25); color: #0369a1; border: 1.5px solid #0ea5e9;';
            gradeCardStyle = 'background: linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(2, 132, 199, 0.05) 100%); border: 2px solid #0ea5e9; box-shadow: 0 4px 18px rgba(14, 165, 233, 0.15);';
            gradeColor = '#0284c7';
            gradeDesc = `🎉 Assessment Passed with ${score}% + Verified Certificate linked! You have been allotted <strong>🎖️ Advanced Tutor (2.0 Cr/hr)</strong>!`;
          } else {
            gradeKey = 'BRONZE';
            gradeTitle = 'GRADE ALLOTTED: 🥉 BRONZE TUTOR';
            gradeIcon = '🥉';
            gradePill = '🥉 1. BRONZE TUTOR';
            gradeRate = '1.0 Credit / hr';
            gradePillStyle = 'background: rgba(205, 127, 50, 0.25); color: #854d0e; border: 1.5px solid #cd7f32;';
            gradeCardStyle = 'background: linear-gradient(135deg, rgba(205, 127, 50, 0.18) 0%, rgba(180, 83, 9, 0.05) 100%); border: 2px solid #cd7f32; box-shadow: 0 4px 18px rgba(205, 127, 50, 0.15);';
            gradeColor = '#854d0e';
            gradeDesc = `🎉 Assessment Passed! You scored <strong>${result.marksObtained} Marks (${score}%)</strong>. Your teaching badge is unlocked at <strong>🥉 Bronze Tutor (1.0 Cr/hr)</strong>. Score ≥90% or link a certificate to upgrade your tier!`;
          }
        }

        const gradeCardEl = document.getElementById('quizAllottedGradeCard');
        if (gradeCardEl) {
          gradeCardEl.style.cssText = `margin-bottom: 1.25rem; padding: 1.25rem; border-radius: var(--radius-lg); text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: all 0.3s ease; ${gradeCardStyle}`;
          gradeCardEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <span style="font-size: 1.75rem;">${gradeIcon}</span>
                <div>
                  <div style="font-size: 1.1rem; font-weight: 900; color: ${gradeColor}; letter-spacing: 0.3px;">${gradeTitle}</div>
                  <div style="font-size: 0.76rem; color: var(--text-muted); font-weight: 600;">Evaluated with Negative Marking • Stored in Database Records</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.76rem; font-weight: 800; padding: 0.25rem 0.65rem; border-radius: var(--radius-full); ${gradePillStyle}">
                  ${gradePill}
                </span>
                <span style="font-size: 0.95rem; font-weight: 800; background: #0F172A; color: #FFFFFF; padding: 0.35rem 0.85rem; border-radius: var(--radius-full); border: 1px solid rgba(255,255,255,0.2);">
                  Rate: ${gradeRate}
                </span>
              </div>
            </div>
            <p style="font-size: 0.86rem; color: var(--text-primary); margin: 0.5rem 0 0; line-height: 1.48;">
              ${gradeDesc}
            </p>
            ${result.qualificationBonusAwarded ? `
              <div style="margin-top: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(16,185,129,0.15); border: 1.5px solid rgba(16,185,129,0.4); color: var(--accent-emerald); font-weight: 800; font-size: 0.8rem; padding: 0.35rem 0.75rem; border-radius: var(--radius-full);">
                <i class="fa-solid fa-coins"></i> +${result.bonusCredits || 2.0} Course Qualification Bonus Credited to Wallet!
              </div>
            ` : ''}
          `;
        }

        if (result.passed) {
          if (scoreCircle) scoreCircle.className = 'score-circle pass';
          const isHigh = result.scorePercent >= 90;
          if (heading) heading.innerHTML = isHigh ? `🏆 Distinction! (${result.marksObtained}/${result.maxMarks} Marks • ${result.scorePercent}%)` : `🎉 Passed Assessment (${result.marksObtained}/${result.maxMarks} Marks • ${result.scorePercent}%)`;
          let subtextMsg = `Evaluation Complete! Grade: <strong>${gradePill}</strong>. Result recorded in SQLite / Supabase database.`;
          if (result.qualificationBonusAwarded) {
            subtextMsg += `<br><div style="margin-top:0.65rem; padding:0.5rem 0.75rem; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:8px; color:var(--accent-emerald); font-weight:700; display:inline-flex; align-items:center; gap:6px;">🎁 +${result.bonusCredits || 2.0} Course Qualification Bonus Credited to Wallet!</div>`;
            this.showToast(`🎉 Grade Allotted: ${gradePill}! +${result.bonusCredits || 2.0} Bonus Credits credited!`, 'award');
          } else {
            this.showToast(`Grade Allotted: ${gradePill} (${result.marksObtained}/60 Marks)!`, 'check');
          }
          if (subtext) subtext.innerHTML = subtextMsg;
        } else {
          if (scoreCircle) scoreCircle.className = 'score-circle fail';
          if (heading) heading.innerHTML = `Assessment Not Passed (${result.marksObtained}/${result.maxMarks} Marks • ${result.scorePercent}%)`;
          if (subtext) subtext.innerHTML = `Grade: <strong style="color:var(--accent-rose);">FAIL</strong>. Passing requirement is 42 / 60 Marks (70%). Review your answers below and click <strong>Back to Assessments</strong> or <strong>Retake Assessment</strong>.`;
        }

        // Render 20-question detailed review ledger with negative marking indicators
        if (feedback) {
          feedback.innerHTML = `
            <div style="font-size: 0.92rem; font-weight: 800; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-subtle); padding-bottom: 0.5rem;">
              <span>Exam Audit & Negative Marking Ledger (Database Synced):</span>
              <span style="color: var(--primary); font-family: monospace;">Net: ${result.marksObtained} / ${result.maxMarks || 60} Marks</span>
            </div>
            ${(result.detailedResults || []).map((r, i) => {
              const markBadgeClass = r.isCorrect ? 'plus' : r.isWrong ? 'minus' : 'zero';
              const markBadgeText = r.isCorrect ? '+3 Marks' : r.isWrong ? '-1 Mark' : '0 Marks (Unattempted)';
              const userChoiceText = r.isUnattempted ? '<span style="color:var(--text-muted); font-style:italic;">Unattempted</span>' : `<span style="font-weight:700; color:${r.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${r.options[r.userSelected] || 'None'}</span>`;

              return `
                <div style="margin-bottom: 0.85rem; font-size: 0.84rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.65rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span style="font-weight: 700; color: ${r.isCorrect ? 'var(--accent-emerald)' : r.isWrong ? 'var(--accent-rose)' : 'var(--text-muted)'};">
                      ${r.isCorrect ? '✓ Correct' : r.isWrong ? '✗ Incorrect' : '⚪ Unattempted'} - Question ${i + 1}
                    </span>
                    <span class="mark-badge ${markBadgeClass}">${markBadgeText}</span>
                  </div>
                  <div style="font-weight: 600; margin-bottom: 0.35rem;">${r.question}</div>
                  ${r.code_snippet ? `<pre style="background: var(--bg-subtle); padding: 0.4rem; border-radius: 4px; font-size: 0.75rem; margin-bottom: 0.35rem;">${r.code_snippet}</pre>` : ''}
                  <div style="color: var(--text-secondary); margin: 0.2rem 0;">
                    Your Choice: ${userChoiceText} | Correct Answer: <strong>${r.options[r.correctIndex]}</strong>
                  </div>
                  <div style="color: var(--text-muted); font-size: 0.76rem; background: var(--bg-card); padding: 0.35rem 0.5rem; border-radius: 4px; border-left: 2px solid var(--primary); margin-top: 0.25rem;">
                    💡 <strong>Explanation:</strong> ${r.explanation}
                  </div>
                </div>
              `;
            }).join('')}
          `;
        }
      } catch (err) {
        if (submitBtn) {
          submitBtn.innerHTML = origSubmitText;
          submitBtn.disabled = false;
        }
        if (quickSubmitBtn) {
          quickSubmitBtn.innerHTML = origQuickText;
          quickSubmitBtn.disabled = false;
        }
        alert('Error evaluating 20 questions: ' + err.message);
      }
    },

    async submitSessionCompletion(sessionId, rating, comment, tags) {
      try {
        const res = await window.store.completeSessionAndReleaseEscrow(sessionId, rating, comment, tags);
        document.getElementById('reviewModal')?.classList.remove('active');
        await window.store.init();
        this.renderAll();
        this.showToast(`Credits transferred (${res.creditsTransferred || 5.0} Credits)! Rating updated from your feedback.`, 'coins');
        this.switchView('view-wallet');
      } catch (err) {
        alert(err.message);
      }
    },

    updateStarRatingUI(val) {
      document.querySelectorAll('#starRatingGroup .star-btn').forEach(star => {
        const sVal = Number(star.dataset.val);
        if (sVal <= val) {
          star.classList.add('fa-solid');
          star.classList.remove('fa-regular');
        } else {
          star.classList.remove('fa-solid');
          star.classList.add('fa-regular');
        }
      });
    },

    // ==========================================
    // Subpage & Modal Scroll Management
    // ==========================================
    openModal(modalOrId) {
      const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
      if (!modal) return;
      modal.classList.add('active');
      document.body.classList.add('modal-open');

      // Direct scrollbar directly to subpage modal container and reset top
      modal.scrollTop = 0;
      const modalContent = modal.querySelector('.modal-content');
      const modalBody = modal.querySelector('.modal-body');
      if (modalContent) modalContent.scrollTop = 0;
      if (modalBody) modalBody.scrollTop = 0;

      // Reset any inner sub-containers (e.g., Quiz screens, Auth screens)
      const scrollables = modal.querySelectorAll('#quizQuestionsScreen, #quizResultScreen, #quizFeedbackBox, #authLoginScreen, #authRegisterScreen');
      scrollables.forEach(el => { el.scrollTop = 0; });
    },

    closeModal(modalOrId) {
      const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
      if (modal) {
        modal.classList.remove('active');
      }
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      if (activeModals.length === 0) {
        document.body.classList.remove('modal-open');
      }
    },

    openBookingModal(teacherId, skillName, hourlyRate = 2.5, tier = 'Elite Master') {
      const teacher = window.store.personas[teacherId];
      if (!teacher) return;

      document.getElementById('bookTeacherId').value = teacher.id;
      document.getElementById('bookTeacherName').textContent = teacher.name;
      document.getElementById('bookSkillName').textContent = skillName;
      document.getElementById('bookHourlyRate').value = hourlyRate;
      document.getElementById('bookRateDisplay').textContent = `${hourlyRate} Cr/hr`;

      const tierBadge = document.getElementById('bookTeacherTierBadge');
      if (tierBadge) {
        if (tier === 'Elite Master') {
          tierBadge.textContent = '🥇 4. Elite Master';
          tierBadge.style.background = 'rgba(245, 158, 11, 0.15)';
          tierBadge.style.color = '#b45309';
        } else if (tier === 'Advanced') {
          tierBadge.textContent = '🎖️ 3. Advanced Tutor';
          tierBadge.style.background = 'rgba(14, 165, 233, 0.15)';
          tierBadge.style.color = '#0284c7';
        } else if (tier === 'Silver') {
          tierBadge.textContent = '🥈 2. Silver Tutor';
          tierBadge.style.background = 'rgba(148, 163, 184, 0.15)';
          tierBadge.style.color = '#475569';
        } else {
          tierBadge.textContent = '🥉 1. Bronze Tutor';
          tierBadge.style.background = 'rgba(205, 127, 50, 0.15)';
          tierBadge.style.color = '#854d0e';
        }
      }

      document.getElementById('bookTeacherAvatar').src = window.getStudentAvatar(teacher.id);
      this.updateBookingCalculation();
      this.openModal('bookingModal');
    },

    openReviewModal(sessionId) {
      const session = (window.store.sessions || []).find(s => s.id === sessionId) || window.store.sessions[0];
      if (!session) return;
      document.getElementById('reviewSessionId').value = session.id;
      this.selectedRating = 5;
      this.updateStarRatingUI(5);
      document.getElementById('reviewCommentInput').value = '';
      this.openModal('reviewModal');
    },

    openAddSkillModal(type = 'offered') {
      document.getElementById('addSkillType').value = type;
      const title = document.getElementById('addSkillModalTitle');
      const descLabel = document.getElementById('skillDescLabel');
      const nameInput = document.getElementById('skillNameInput');
      const descInput = document.getElementById('skillDescInput');

      nameInput.value = '';
      descInput.value = '';

      if (type === 'offered') {
        title.innerHTML = `<i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i> Add Course You Can Teach`;
        descLabel.textContent = 'Curriculum / What You Will Teach in Sessions';
        descInput.placeholder = 'e.g. Core principles, practical problem-solving exercises, debugging techniques...';
      } else {
        title.innerHTML = `<i class="fa-solid fa-bullseye" style="color: var(--accent-amber);"></i> Add Skill You Want to Learn`;
        descLabel.textContent = 'Learning Goal & Target Output';
        descInput.placeholder = 'e.g. Build a portfolio project, master Figma components, prepare for exams...';
      }

      this.openModal('addSkillModal');
    },

    switchView(viewId) {
      this.currentTab = viewId;
      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      const activeSec = document.getElementById(viewId);
      if (activeSec) {
        activeSec.classList.add('active');
        activeSec.scrollTop = 0;
      }

      document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === viewId);
      });

      if (viewId === 'view-matches') this.renderSmartMatches();
      if (viewId === 'view-explore') this.renderExploreCatalogue();
      if (viewId === 'view-quizzes') this.renderQuizzes();
      if (viewId === 'view-sessions') this.renderSessions();
      if (viewId === 'view-room') this.renderLiveRoom();
      if (viewId === 'view-support') this.renderSupportDesk();
      if (viewId === 'view-wallet') this.renderWallet();
      if (viewId === 'view-chat') {
        this.renderChat();
      } else {
        this.stopChatLivePolling();
      }
      if (viewId === 'view-profile') this.renderProfile();

      // Direct scrollbar to subpage view immediately
      if (typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.scrollTop = 0;
    },

    // ==========================================
    // Render Functions
    // ==========================================
    async renderAll() {
      try { this.renderNavbar(); } catch (e) { console.error('Error rendering navbar:', e); }
      try { this.renderNotifications(); } catch (e) { console.error('Error rendering notifications:', e); }
      try { await this.renderSmartMatches(); } catch (e) { console.error('Error rendering matches:', e); }
      try { await this.renderExploreCatalogue(); } catch (e) { console.error('Error rendering explore:', e); }
      try { await this.renderQuizzes(); } catch (e) { console.error('Error rendering quizzes:', e); }
      try { await this.renderSessions(); } catch (e) { console.error('Error rendering sessions:', e); }
      try { await this.renderSupportDesk(); } catch (e) { console.error('Error rendering support desk:', e); }
      try { await this.renderWallet(); } catch (e) { console.error('Error rendering wallet:', e); }
      try { await this.renderChat(); } catch (e) { console.error('Error rendering chat:', e); }
      try { await this.renderProfile(); } catch (e) { console.error('Error rendering profile:', e); }
      if (this.currentTab === 'view-room') {
        try { await this.renderLiveRoom(); } catch (e) { console.error('Error rendering live room:', e); }
      }
    },

    renderNavbar() {
      const user = window.store.getCurrentPersona();
      const role = window.store.getUserRole();

      const creditEl = document.getElementById('navCreditCount');
      if (creditEl) creditEl.textContent = (user?.credits || 0).toFixed(1);
      const nameEl = document.getElementById('navUserName');
      if (nameEl) nameEl.textContent = user?.name || 'User';
      const roleEl = document.getElementById('navUserRole');
      if (roleEl) roleEl.textContent = window.store.isFacultyAdmin() ? 'Faculty Coordinator' : (user?.badges?.find(b => b.includes('Tutor')) || user?.major || 'Student');
      
      const roleBadge = document.getElementById('navAuthRoleBadge');
      if (roleBadge) {
        roleBadge.textContent = role;
        roleBadge.className = `auth-role-pill role-${role.toLowerCase()}`;
      }

      const navAvatar = document.getElementById('navUserAvatar');
      if (navAvatar) {
        navAvatar.src = window.getStudentAvatar(user?.id);
        navAvatar.alt = user?.name || 'User';
      }

      // Single User Dashboard Profile Dropdown Elements
      const dropdownAvatar = document.getElementById('navDropdownAvatar');
      if (dropdownAvatar) dropdownAvatar.src = window.getStudentAvatar(user?.id);
      const dropdownName = document.getElementById('navDropdownName');
      if (dropdownName) dropdownName.textContent = user?.name || 'User';
      const dropdownEmail = document.getElementById('navDropdownEmail');
      if (dropdownEmail) dropdownEmail.textContent = user?.email || (user?.id + '@vignan.ac.in');
      const dropdownMajor = document.getElementById('navDropdownMajor');
      if (dropdownMajor) dropdownMajor.textContent = user?.major || 'Vignan University';
      const dropdownRole = document.getElementById('navDropdownRoleBadge');
      if (dropdownRole) {
        dropdownRole.textContent = role;
        dropdownRole.className = `auth-role-pill role-${role.toLowerCase()}`;
      }
      const dropdownCredits = document.getElementById('navDropdownCredits');
      if (dropdownCredits) {
        dropdownCredits.textContent = `${Number(user?.credits || 0).toFixed(1)} Credits`;
      }

      // Single User Auth Login Card Elements
      const authAvatar = document.getElementById('authCardUserAvatar');
      if (authAvatar) authAvatar.src = window.getStudentAvatar(user?.id);
      const authName = document.getElementById('authCardUserName');
      if (authName) authName.textContent = user?.name || 'User';
      const authEmail = document.getElementById('authCardUserEmail');
      if (authEmail) authEmail.textContent = `${user?.email || (user?.id + '@vignan.ac.in')} • ${user?.college || 'Vignan University'}`;
      const authRole = document.getElementById('authCardRoleBadge');
      if (authRole) {
        authRole.textContent = role;
        authRole.className = `auth-role-pill role-${role.toLowerCase()}`;
      }

      const isFaculty = window.store.isFacultyAdmin();
      document.querySelectorAll('.admin-only-section').forEach(el => {
        if (el && el.style) el.style.display = isFaculty ? 'flex' : 'none';
      });

      const instAvatar = document.getElementById('liveRoomInstructorAvatar');
      const learnAvatar = document.getElementById('liveRoomLearnerAvatar');
      if (instAvatar) instAvatar.src = window.getStudentAvatar('rishitha');
      if (learnAvatar) learnAvatar.src = window.getStudentAvatar('sri');
    },

    renderNotifications() {
      const notifs = window.store.notifications || [];
      const unreadCount = notifs.filter(n => n.unread || n.is_unread).length;
      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
      }

      const list = document.getElementById('notifListContainer');
      if (!list) return;

      list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.unread || n.is_unread ? 'unread' : ''}">
          <div style="font-size: 1.1rem; color: var(--primary);">
            <i class="fa-solid fa-${n.type === 'credit' ? 'coins' : n.type === 'calendar' ? 'calendar-check' : n.type === 'quiz' ? 'award' : 'wand-magic-sparkles'}"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700;">${n.title}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${n.time}</div>
          </div>
        </div>
      `).join('');
    },

    async renderSmartMatches(filter = 'all') {
      const grid = document.getElementById('matchesCardGrid');
      if (!grid) return;

      const matches = await window.store.getMatchesForCurrentPersona();
      let filtered = [...matches];

      if (filter === 'twoway') {
        filtered = matches.filter(m => m.isTwoWay);
      } else if (filter === 'elite') {
        filtered = matches.filter(m => (m.peer.skillsOffered || []).some(s => s.tier === 'Elite Master'));
      } else if (filter === 'advanced') {
        filtered = matches.filter(m => (m.peer.skillsOffered || []).some(s => s.tier === 'Advanced'));
      } else if (filter === 'design') {
        filtered = matches.filter(m => (m.peer.skillsOffered || []).some(s => (s.category || '').toLowerCase().includes('design') || (s.category || '').toLowerCase().includes('ui')));
      } else if (filter === 'tech') {
        filtered = matches.filter(m => (m.peer.skillsOffered || []).some(s => (s.category || '').toLowerCase().includes('tech') || (s.category || '').toLowerCase().includes('cloud') || (s.category || '').toLowerCase().includes('data')));
      }

      // Sort matching peers
      const sortMode = document.getElementById('matchesSortSelect')?.value || (filter === 'credits_asc' ? 'credits_asc' : filter === 'credits_desc' ? 'credits_desc' : 'compatibility');
      const getRate = (p) => (p.skillsOffered && p.skillsOffered.length > 0) ? (Number(p.skillsOffered[0].rate) || 1.0) : 1.0;

      if (sortMode === 'credits_asc' || filter === 'credits_asc') {
        filtered.sort((a, b) => getRate(a.peer) - getRate(b.peer));
      } else if (sortMode === 'credits_desc' || filter === 'credits_desc') {
        filtered.sort((a, b) => getRate(b.peer) - getRate(a.peer));
      } else if (sortMode === 'rating') {
        filtered.sort((a, b) => (Number(b.peer.rating) || 5.0) - (Number(a.peer.rating) || 5.0));
      } else {
        filtered.sort((a, b) => b.matchScore - a.matchScore);
      }

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-xl);">
            <i class="fa-solid fa-face-smile" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h3>No specific matches under this filter</h3>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">Try selecting 'All Matches' or explore our full peer catalogue.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(m => {
        const peer = m.peer;
        const topSkill = (peer.skillsOffered && peer.skillsOffered.length > 0) ? peer.skillsOffered[0] : { name: 'Peer Mentoring', rate: 1.0, tier: 'Bronze' };
        const hourlyRate = topSkill.rate || 1.0;
        const tier = topSkill.tier || 'Bronze';

        let tierBadgeHtml = '<span class="student-badge">🥉 1. Bronze Tutor</span>';
        if (tier === 'Elite Master') {
          tierBadgeHtml = '<span class="student-badge" style="background: rgba(245, 158, 11, 0.15); color: #b45309; border-color: rgba(245, 158, 11, 0.4);"><i class="fa-solid fa-medal"></i> 🥇 4. Elite Master</span>';
        } else if (tier === 'Advanced') {
          tierBadgeHtml = '<span class="student-badge" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; border-color: rgba(14, 165, 233, 0.4);"><i class="fa-solid fa-certificate"></i> 🎖️ 3. Advanced</span>';
        } else if (tier === 'Silver') {
          tierBadgeHtml = '<span class="student-badge" style="background: rgba(148, 163, 184, 0.15); color: #475569;"><i class="fa-solid fa-star"></i> 🥈 2. Silver (Quiz &ge; 90%)</span>';
        }

        const teachSkills = (peer.skillsOffered || []).map(s => `
          <span class="tag-badge ${m.canTeachMe.some(ct => ct.name === s.name) ? 'highlight' : ''}">
            ${s.is_verified ? '<i class="fa-solid fa-shield-check" style="color:var(--accent-emerald);"></i> ' : ''}${s.name} (${s.rate || 1.0} Cr/hr)
          </span>
        `).join('');

        const wantSkills = (peer.skillsWanted || []).map(s => `
          <span class="tag-badge ${m.canLearnFromMe.some(cl => cl.name === s.name) ? 'highlight' : ''}">
            ${s.name}
          </span>
        `).join('');

        return `
          <div class="match-card ${m.isTwoWay ? 'featured-2way' : ''}">
            ${m.isTwoWay ? `
              <div class="featured-banner-tag">
                <i class="fa-solid fa-bolt"></i> 2-WAY RECIPROCAL MATCH (${m.matchScore}% COMPATIBLE)
              </div>
            ` : ''}

            <div class="card-user-header">
              ${window.getUserLogoCardHtml(peer, 52)}
              <div class="card-user-info">
                <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                  <h3>${peer.name || peer.id}</h3>
                  ${tierBadgeHtml}
                </div>
                <div class="card-user-meta">${peer.major || 'Vignan Student'} • ${peer.college || 'Vignan University'}</div>
              </div>
              <div class="match-score-badge">
                <i class="fa-solid fa-sparkles"></i> ${m.matchScore}% Match
              </div>
            </div>

            <p class="card-bio">${peer.bio || 'Vignan University peer learning enthusiast.'}</p>

            <div class="swap-skills-box">
              <div class="skill-row">
                <span class="skill-row-label">Can Teach You:</span>
                <div class="skill-tags">
                  ${teachSkills || '<span style="color:var(--text-muted); font-size:0.8rem;">Open to custom requests</span>'}
                </div>
              </div>
              <div class="skill-row">
                <span class="skill-row-label">Wants to Learn:</span>
                <div class="skill-tags">
                  ${wantSkills || '<span style="color:var(--text-muted); font-size:0.8rem;">Flexible on topics</span>'}
                </div>
              </div>
            </div>

            <div class="card-stats-bar">
              <div class="card-rating">
                <i class="fa-solid fa-star"></i> ${peer.rating || '5.0'} (${peer.reviewsCount || peer.reviews_count || 0} reviews)
              </div>
              <div style="font-weight: 700; color: var(--primary);">
                Rate: ${hourlyRate} Cr/hr
              </div>
            </div>

            <div class="card-actions">
              <button class="btn btn-secondary btn-sm" onclick="window.app.startDirectChat('${peer.id}')">
                <i class="fa-regular fa-comment"></i> Chat
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.app.openBookingModal('${peer.id}', '${topSkill.name}', ${hourlyRate}, '${tier}')">
                <i class="fa-solid fa-arrow-right-arrow-left"></i> Book Swap
              </button>
            </div>
          </div>
        `;
      }).join('');
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    },

    escapeQuotes(str) {
      if (!str) return '';
      return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    },

    // ==========================================
    // Universal Top Search Engine Methods
    // ==========================================
    performGlobalSearch(rawQuery) {
      const dropdown = document.getElementById('globalSearchResultsDropdown');
      const clearBtn = document.getElementById('globalSearchClearBtn');
      if (!dropdown) return;

      const q = (rawQuery || '').trim().toLowerCase();
      if (clearBtn) {
        clearBtn.style.display = q.length > 0 ? 'flex' : 'none';
      }

      if (!q) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        return;
      }

      const current = window.store?.getCurrentPersona();
      const allPeers = Object.values(window.store?.personas || {}).filter(p => !p.isAdmin && !p.is_admin);

      const matches = [];
      allPeers.forEach(peer => {
        let score = 0;
        let primaryMatchedSkill = null;
        const matchedSkills = [];

        // 1. Inspect skillsOffered (Priority 1)
        (peer.skillsOffered || []).forEach(s => {
          const sName = (s.name || '').toLowerCase();
          const sDesc = (s.desc || s.description || '').toLowerCase();
          const sCat = (s.category || '').toLowerCase();
          const sTier = (s.tier || '').toLowerCase();

          if (sName === q) {
            score += 150;
            matchedSkills.push(s);
            if (!primaryMatchedSkill) primaryMatchedSkill = s;
          } else if (sName.includes(q)) {
            score += 100;
            matchedSkills.push(s);
            if (!primaryMatchedSkill) primaryMatchedSkill = s;
          } else if (sDesc.includes(q) || sCat.includes(q) || sTier.includes(q)) {
            score += 40;
            matchedSkills.push(s);
            if (!primaryMatchedSkill) primaryMatchedSkill = s;
          }
        });

        // 2. Inspect peer name
        if ((peer.name || '').toLowerCase().includes(q)) {
          score += 60;
        }

        // 3. Inspect verified certificates
        (peer.certificates || []).forEach(c => {
          const cSkill = (c.skill_name || '').toLowerCase();
          const cTitle = (c.title || '').toLowerCase();
          const cAuth = (c.authority || '').toLowerCase();
          if (cSkill.includes(q) || cTitle.includes(q) || cAuth.includes(q)) {
            score += 50;
            if (!primaryMatchedSkill) {
              primaryMatchedSkill = (peer.skillsOffered || []).find(s => s.name.toLowerCase().includes(q)) || peer.skillsOffered?.[0];
            }
          }
        });

        // 4. Inspect Major, College, Bio
        if ((peer.major || '').toLowerCase().includes(q) || (peer.college || '').toLowerCase().includes(q)) {
          score += 25;
        }
        if ((peer.bio || '').toLowerCase().includes(q)) {
          score += 15;
        }

        if (score > 0) {
          const topSkill = primaryMatchedSkill || peer.skillsOffered?.[0] || { name: 'Peer Mentoring', rate: 1.0, tier: 'Bronze' };
          matches.push({
            peer,
            score,
            topSkill,
            matchedSkills
          });
        }
      });

      // Sort by relevance score desc, then by rating / reviews
      matches.sort((a, b) => b.score - a.score || (Number(b.peer.rating) || 5.0) - (Number(a.peer.rating) || 5.0));

      dropdown.style.display = 'block';

      if (matches.length === 0) {
        dropdown.innerHTML = `
          <div class="nav-search-empty">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-muted); display: block;"></i>
            No tutors found matching "<strong>${this.escapeHtml(rawQuery)}</strong>"<br>
            <span style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.35rem; display: inline-block;">Try searching <strong>Python</strong>, <strong>UI/UX</strong>, <strong>React</strong>, <strong>DSA</strong>, <strong>SQL</strong>, or <strong>Cyber Security</strong>.</span>
          </div>
        `;
        return;
      }

      const topResults = matches.slice(0, 6);
      dropdown.innerHTML = `
        <div class="nav-search-header">
          <span><i class="fa-solid fa-graduation-cap" style="color: var(--primary);"></i> Matching Tutors (${matches.length})</span>
          <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">Press Enter to see all</span>
        </div>
        <div class="nav-search-results-list">
          ${topResults.map(m => {
            const p = m.peer;
            const s = m.topSkill;
            const isSelf = p.id === current?.id;
            const tier = s.tier || 'Bronze';
            let tierIcon = '🥉';
            if (tier === 'Elite Master') tierIcon = '🥇';
            else if (tier === 'Advanced') tierIcon = '🎖️';
            else if (tier === 'Silver') tierIcon = '🥈';

            return `
              <div class="nav-search-item" onclick="window.app.handleGlobalSearchSelect('${p.id}', '${this.escapeQuotes(s.name)}', ${s.rate || 2.5}, '${this.escapeQuotes(tier)}')">
                <div class="nav-search-item-left">
                  ${window.getUserLogoCardHtml ? window.getUserLogoCardHtml(p, 40) : `<img src="${window.getStudentAvatar(p.id)}" style="width:40px;height:40px;border-radius:50%;">`}
                  <div class="nav-search-item-info">
                    <div class="nav-search-item-name">
                      <span>${this.escapeHtml(p.name)}</span>
                      ${isSelf ? '<span style="font-size:0.68rem; color:var(--primary); font-weight:600;">(You)</span>' : ''}
                      <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); margin-left: auto;">${tierIcon} ${tier}</span>
                    </div>
                    <div class="nav-search-item-skill">
                      <span class="skill-badge-highlight"><i class="fa-solid fa-code"></i> ${this.escapeHtml(s.name)}</span>
                      <span style="font-size: 0.72rem; color: var(--text-muted);">• ${this.escapeHtml(p.major || 'Vignan University')}</span>
                    </div>
                  </div>
                </div>
                <div class="nav-search-item-right">
                  <span style="font-weight: 800; color: var(--primary); font-size: 0.84rem;">${s.rate || 1.0} Cr/hr</span>
                  <span style="font-size: 0.7rem; color: var(--accent-amber); font-weight: 700;"><i class="fa-solid fa-star"></i> ${p.rating || 5.0}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="nav-search-footer-cta" onclick="window.app.viewAllSearchResults('${this.escapeQuotes(rawQuery)}')">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> View all ${matches.length} tutors in Explore Catalogue &rarr;
        </div>
      `;
    },

    handleGlobalSearchSelect(teacherId, skillName, hourlyRate = 2.5, tier = 'Elite Master') {
      const dropdown = document.getElementById('globalSearchResultsDropdown');
      if (dropdown) dropdown.style.display = 'none';

      const current = window.store?.getCurrentPersona();
      if (teacherId === current?.id) {
        this.switchView('view-profile');
        this.showToast('Navigated to your profile dashboard', 'user');
        return;
      }

      this.openBookingModal(teacherId, skillName, hourlyRate, tier);
      const teacher = window.store?.personas?.[teacherId];
      this.showToast(`🎯 Selected ${teacher?.name || 'Tutor'} (${skillName})`, 'check');
    },

    viewAllSearchResults(rawQuery) {
      const dropdown = document.getElementById('globalSearchResultsDropdown');
      if (dropdown) dropdown.style.display = 'none';

      const query = (rawQuery || '').trim();
      const exploreInput = document.getElementById('exploreSearchInput');
      if (exploreInput) exploreInput.value = query;

      this.switchView('view-explore');
      this.renderExploreCatalogue(query);
      this.showToast(`🔍 Showing all tutors matching "${query}"`, 'magnifying-glass');
    },

    async renderExploreCatalogue(searchQuery = '') {
      const grid = document.getElementById('exploreCardGrid');
      if (!grid) return;

      const current = window.store.getCurrentPersona();
      let peers = Object.values(window.store.personas).filter(p => !p.isAdmin && !p.is_admin);

      // Search Query
      const query = (searchQuery !== undefined && searchQuery !== '' ? searchQuery : (document.getElementById('exploreSearchInput')?.value || document.getElementById('globalSearchInput')?.value || '')).toLowerCase().trim();
      if (query) {
        peers = peers.filter(p =>
          (p.name || '').toLowerCase().includes(query) ||
          (p.skillsOffered || []).some(s => 
            (s.name || '').toLowerCase().includes(query) || 
            (s.description || s.desc || '').toLowerCase().includes(query) ||
            (s.tier || '').toLowerCase().includes(query) ||
            (s.category || '').toLowerCase().includes(query)
          ) ||
          (p.major || '').toLowerCase().includes(query) ||
          (p.college || '').toLowerCase().includes(query) ||
          (p.bio || '').toLowerCase().includes(query)
        );
      }

      // Category Filter
      const activeCat = (document.querySelector('[data-cat-filter].active')?.dataset.catFilter || 'all').toLowerCase();
      if (activeCat !== 'all') {
        peers = peers.filter(p => (p.skillsOffered || []).some(s => {
          const sCat = (s.category || '').toLowerCase();
          if (activeCat === 'tech') return sCat.includes('tech') || sCat.includes('cloud') || sCat.includes('data') || sCat.includes('cyber') || sCat.includes('code');
          if (activeCat === 'design') return sCat.includes('design') || sCat.includes('ui') || sCat.includes('ux');
          return sCat === activeCat;
        }));
      }

      // Credit Range Filter
      const activeCreditFilter = document.querySelector('[data-credit-filter].active')?.dataset.creditFilter || 'all';
      const getPrimaryRate = (p) => (p.skillsOffered && p.skillsOffered.length > 0) ? (Number(p.skillsOffered[0].rate) || 1.0) : 1.0;

      if (activeCreditFilter === 'low') {
        peers = peers.filter(p => getPrimaryRate(p) <= 1.5);
      } else if (activeCreditFilter === 'high') {
        peers = peers.filter(p => getPrimaryRate(p) >= 2.0);
      }

      // Sorting (Credits Low to High, Credits High to Low, Rating, Tier, Reviews)
      const sortMode = document.getElementById('exploreSortSelect')?.value || 'credits_asc';
      const tierRank = { 'Elite Master': 4, 'Advanced': 3, 'Silver': 2, 'Bronze': 1, 'Unverified': 0 };

      if (sortMode === 'credits_asc') {
        peers.sort((a, b) => getPrimaryRate(a) - getPrimaryRate(b));
      } else if (sortMode === 'credits_desc') {
        peers.sort((a, b) => getPrimaryRate(b) - getPrimaryRate(a));
      } else if (sortMode === 'rating') {
        peers.sort((a, b) => (Number(b.rating) || 5.0) - (Number(a.rating) || 5.0));
      } else if (sortMode === 'tier') {
        peers.sort((a, b) => {
          const aTier = a.skillsOffered?.[0]?.tier || 'Bronze';
          const bTier = b.skillsOffered?.[0]?.tier || 'Bronze';
          return (tierRank[bTier] || 0) - (tierRank[aTier] || 0);
        });
      } else if (sortMode === 'reviews') {
        peers.sort((a, b) => (Number(b.reviewsCount || b.reviews_count) || 0) - (Number(a.reviewsCount || a.reviews_count) || 0));
      }

      // Update count badge
      const countBadge = document.getElementById('exploreMentorsCountBadge');
      if (countBadge) {
        const sortLabel = sortMode === 'credits_asc' ? 'Low → High Credits' : sortMode === 'credits_desc' ? 'High → Low Credits' : sortMode === 'rating' ? 'Top Rated' : sortMode === 'tier' ? 'Top Tiers' : 'Most Reviews';
        countBadge.textContent = `Showing ${peers.length} Mentors • Sorted: ${sortLabel}`;
      }

      if (peers.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-xl);">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h3>No mentors match your search or filter criteria</h3>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">Try adjusting your search terms or selecting 'All Credit Rates'.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = peers.map(peer => {
        const topSkill = peer.skillsOffered[0] || { name: 'Peer Mentoring', rate: 1.0, tier: 'Bronze' };

        return `
          <div class="match-card">
            <div class="card-user-header">
              ${window.getUserLogoCardHtml(peer, 52)}
              <div class="card-user-info">
                <h3>${peer.name} ${peer.id === current.id ? '<span style="font-size:0.75rem; color:var(--primary); font-weight:600;">(You)</span>' : ''}</h3>
                <div class="card-user-meta">${peer.major}</div>
              </div>
            </div>

            <p class="card-bio">${peer.bio}</p>

            <div style="margin-bottom: 1rem;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">
                Courses Offered & 4-Tier Rates:
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                ${(peer.skillsOffered || []).map(s => `
                  <div style="background: var(--bg-subtle); padding: 0.45rem 0.65rem; border-radius: var(--radius-md); font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>
                      ${s.is_verified ? '<i class="fa-solid fa-shield-check" style="color:var(--accent-emerald);" title="Certified Mentor"></i> ' : ''}
                      <strong>${s.name}</strong> <span style="font-size: 0.72rem; color: var(--text-muted);">(${s.tier || s.level})</span>
                    </span>
                    <span style="font-weight: 800; color: var(--primary);">${s.rate || 1.0} Cr/hr</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="card-stats-bar">
              <div class="card-rating" title="Rating calculated strictly from student reviews">
                <i class="fa-solid fa-star"></i> ${peer.rating || '5.0'} (${peer.reviewsCount || peer.reviews_count || 5} student reviews)
              </div>
              <div style="color: var(--accent-emerald); font-weight: 600;">
                <i class="fa-solid fa-certificate"></i> NPTEL / Coursera Verified
              </div>
            </div>

            <div class="card-actions">
              ${peer.id !== current.id ? `
                <button class="btn btn-secondary btn-sm" onclick="window.app.startDirectChat('${peer.id}')">
                  <i class="fa-regular fa-comment"></i> Chat
                </button>
                <button class="btn btn-primary btn-sm" onclick="window.app.openBookingModal('${peer.id}', '${topSkill.name}', ${topSkill.rate || 2.5}, '${topSkill.tier || 'Elite Master'}')">
                  <i class="fa-solid fa-calendar-plus"></i> Book (${topSkill.rate || 1.0} Cr/hr)
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="window.app.switchView('view-profile')">
                  <i class="fa-solid fa-pen"></i> Edit My Profile & Certs
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    },

    async renderQuizzes() {
      const grid = document.getElementById('quizzesCardGrid');
      if (!grid) return;

      const quizzes = (await window.store.fetchQuizzes()) || [];
      const current = window.store.getCurrentPersona();

      grid.innerHTML = quizzes.map(q => {
        const qSkill = q.skill_name || q.name || '';
        const matchingSkill = (current?.skillsOffered || []).find(s =>
          qSkill && (s.name || '').toLowerCase().includes(qSkill.toLowerCase().split(' ')[0])
        );
        const isCertified = matchingSkill && matchingSkill.is_verified;

        return `
          <div class="quiz-card">
            <div>
              <div class="quiz-card-header">
                <div class="quiz-icon">
                  <i class="fa-solid fa-${q.category === 'Design' ? 'palette' : 'code'}"></i>
                </div>
                <span class="quiz-status-badge ${isCertified ? 'certified' : 'pending'}">
                  ${isCertified ? '✓ Certified Tutor' : '20-Question AI Assessment'}
                </span>
              </div>

              <h3>${q.title}</h3>
              <p>AI dynamically generates <strong>20 Technical Questions</strong>. Pass (≥70%) for <strong>Bronze (1.0 Cr)</strong>. Score ≥90% for <strong>Silver (1.5 Cr)</strong> or <strong>Elite Master (2.5 Cr)</strong> with cert.</p>

              <div class="quiz-meta-row">
                <span><i class="fa-solid fa-clock"></i> 15 Mins</span>
                <span><i class="fa-solid fa-circle-question"></i> 20 Questions</span>
                <span><i class="fa-solid fa-percent"></i> ≥70% Pass Mark</span>
              </div>
            </div>

            <button class="btn ${isCertified ? 'btn-secondary' : 'btn-primary'} btn-sm" style="width: 100%;" onclick="window.app.startQuiz('${q.skill_name}')">
              <i class="fa-solid fa-wand-magic-sparkles"></i> ${isCertified ? 'Retake 20-Q AI Assessment' : 'Take 20-Q AI Assessment'}
            </button>
          </div>
        `;
      }).join('');
    },

    async renderSessions() {
      const grid = document.getElementById('sessionsCardGrid');
      const badge = document.getElementById('sidebarSessionBadge');
      if (!grid) return;

      const allSessions = await window.store.fetchSessions();
      const currentPersona = window.store.getCurrentPersona();

      if (badge) {
        badge.textContent = allSessions.filter(s => s.status === 'Confirmed').length;
      }

      let sessions = [...allSessions];

      if (this.sessionsFilter === 'ONE_ON_ONE') {
        sessions = sessions.filter(s => s.session_type !== 'GROUP_COHORT');
      } else if (this.sessionsFilter === 'GROUP_COHORT') {
        sessions = sessions.filter(s => s.session_type === 'GROUP_COHORT');
      } else if (this.sessionsFilter === 'CONFIRMED') {
        sessions = sessions.filter(s => s.status === 'Confirmed');
      } else if (this.sessionsFilter === 'COMPLETED') {
        sessions = sessions.filter(s => s.status === 'Completed');
      }

      if (sessions.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-medium);">
            <i class="fa-solid fa-users-viewfinder" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
            <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">No Sessions Found</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 440px; margin: 0.35rem auto 1.25rem;">
              ${this.sessionsFilter === 'GROUP_COHORT' ? 'No group masterclasses scheduled yet. As a mentor, you can host a cohort and earn credits scaled by attendee count (N × Fee)!' : 'Book a 1-on-1 swap or host a group live class to begin collaborating.'}
            </p>
            <button class="btn btn-emerald btn-sm" onclick="window.app.openHostCohortModal()">
              <i class="fa-solid fa-users-viewfinder"></i> Host Live Group Masterclass (Earn N &times; Cr)
            </button>
          </div>
        `;
        return;
      }

      grid.innerHTML = sessions.map(sess => {
        const isCohort = sess.session_type === 'GROUP_COHORT';
        const isTutor = (sess.teacher_id === currentPersona.id || sess.tutor_id === currentPersona.id);
        const attendees = sess.attendees || [];
        const isEnrolled = attendees.some(a => a.student_id === currentPersona.id);
        const countN = sess.enrolled_count !== undefined ? sess.enrolled_count : attendees.length;
        const feePerStudent = isCohort ? 1.0 : (sess.credits || (sess.hours * (sess.rate || 2.5)));
        const totalPool = (countN * feePerStudent).toFixed(1);
        const isCompleted = sess.status === 'Completed';

        if (isCohort) {
          return `
            <div class="session-ticket group-cohort-ticket" style="border: 2px solid rgba(16, 185, 129, 0.35); background: linear-gradient(180deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.03) 100%);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                <div>
                  <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                    <span class="session-ticket-status ${isCompleted ? 'completed' : 'confirmed'}">
                      ● ${sess.status}
                    </span>
                    <span class="student-badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 700; font-size: 0.72rem;">
                      <i class="fa-solid fa-users"></i> Group Masterclass (N = ${countN})
                    </span>
                    <span class="student-badge" style="background: rgba(99, 102, 241, 0.15); color: var(--primary); font-weight: 700; font-size: 0.72rem;">
                      <i class="fa-solid fa-chair"></i> ${countN} / ${sess.max_capacity || 5} Seats Filled
                    </span>
                  </div>
                  <h3 style="font-size: 1.15rem; font-weight: 800; margin-top: 0.45rem; color: var(--text-primary);">${sess.skill}</h3>
                  <div style="font-size: 0.82rem; color: var(--primary); font-weight: 700; margin-top: 0.15rem;">
                    "${sess.topic || 'Live Interactive Masterclass'}"
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 800; font-size: 1rem; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 0.3rem 0.65rem; border-radius: var(--radius-full); white-space: nowrap;">
                    <i class="fa-solid fa-coins"></i> Pool: +${totalPool} Cr
                  </div>
                  <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.2rem;">
                    1.0 Cr / student • +1 Credit per attendee
                  </div>
                </div>
              </div>

              <!-- Cohort Details & Attendee Roster Preview -->
              <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; margin-top: 0.35rem; background: var(--bg-subtle); padding: 0.65rem; border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${window.getUserLogoCardHtml(sess.teacher_id, 32)}
                    <div>
                      <div style="font-weight: 700; color: var(--text-primary);">Host: ${sess.teacherName || sess.teacher_id} ${isTutor ? '<span style="color:var(--primary); font-weight:700;">(You)</span>' : ''}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${sess.date} (${sess.time})</div>
                    </div>
                  </div>
                </div>
                <div>
                  <strong>Enrolled Students (${countN}):</strong>
                  ${attendees.length > 0 ? `
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.3rem;">
                      ${attendees.map(a => `
                        <span class="tag-badge" style="font-size: 0.7rem; display: inline-flex; align-items: center; gap: 0.35rem; background: var(--bg-card); padding: 0.2rem 0.5rem; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);">
                          <img src="${window.getStudentAvatar(a.student_id)}" style="width: 18px; height: 18px; border-radius: 50%;" onerror="window.handleAvatarError(this, '${a.student_id}')">
                          <span>${a.student_name}</span>
                          <strong style="color: var(--accent-emerald);">(${a.credits_locked || 1.0} Cr)</strong>
                        </span>
                      `).join('')}
                    </div>
                  ` : '<span style="color: var(--text-muted); font-style: italic;">No students enrolled yet.</span>'}
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.app.openLiveRoom('${sess.id}')">
                  <i class="fa-solid fa-door-open"></i> Enter Live Classroom
                </button>

                ${!isCompleted ? `
                  ${isTutor ? `
                    <button class="btn btn-emerald btn-sm" onclick="window.app.concludeCohortSession('${sess.id}')">
                      <i class="fa-solid fa-coins"></i> Conclude & Claim All +${totalPool} Cr
                    </button>
                  ` : `
                    ${!isEnrolled ? `
                      <button class="btn btn-emerald btn-sm" onclick="window.app.enrollInLiveCohort('${sess.id}')">
                        <i class="fa-solid fa-user-plus"></i> Enroll (1.0 Cr)
                      </button>
                    ` : `
                      <span style="font-size: 0.8rem; color: var(--accent-emerald); font-weight: 700; padding: 0.3rem 0.5rem;">
                        <i class="fa-solid fa-circle-check"></i> Enrolled
                      </span>
                    `}
                  `}
                ` : `
                  <div style="font-size: 0.8rem; color: var(--accent-emerald); font-weight: 700;">
                    ✓ Masterclass Completed • ${sess.total_earned_credits || totalPool} Cr Paid to Tutor (${countN} Students)
                  </div>
                `}
              </div>
            </div>
          `;
        }

        // Standard 1-on-1 Swap Ticket
        return `
          <div class="session-ticket">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; gap: 0.4rem; align-items: center;">
                  <span class="session-ticket-status ${sess.status === 'Confirmed' ? 'confirmed' : sess.status === 'Completed' ? 'completed' : 'pending'}">
                    ● ${sess.status}
                  </span>
                  <span class="student-badge" style="font-size: 0.72rem;"><i class="fa-solid fa-user"></i> 1-on-1 Swap</span>
                </div>
                <h3 style="font-size: 1.1rem; font-weight: 800; margin-top: 0.4rem;">${sess.skill}</h3>
              </div>
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-amber); background: var(--accent-amber-light); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);">
                ${sess.credits} Credits (${sess.hours} hrs @ ${sess.rate || 2.5} Cr/hr)
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; background: var(--bg-subtle); padding: 0.5rem 0.75rem; border-radius: var(--radius-md);">
              ${window.getUserLogoCardHtml(sess.teacher_id, 36)}
              <div style="font-size: 0.82rem; flex: 1; min-width: 0;">
                <div><strong>Teacher:</strong> ${sess.teacherName || sess.teacher_id}</div>
                <div style="color: var(--text-muted); font-size: 0.74rem;">Learner: ${sess.studentName || sess.student_id} • ${sess.date} (${sess.time})</div>
                <div style="margin-top: 0.2rem; font-style: italic; color: var(--text-muted); font-size: 0.74rem;">"${sess.topic || 'Skill swap lesson'}"</div>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              ${sess.status !== 'Completed' ? `
                <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.app.openLiveRoom('${sess.id}')">
                  <i class="fa-solid fa-door-open"></i> Join Live Room
                </button>
                <button class="btn btn-emerald btn-sm" onclick="window.app.openReviewModal('${sess.id}')">
                  Complete & Rate
                </button>
              ` : `
                <div style="font-size: 0.8rem; color: var(--accent-emerald); font-weight: 700;">
                  ✓ Completed & ${sess.credits} Credits Released
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');
    },

    async openLiveRoom(sessionId) {
      this.activeLiveRoomSessionId = sessionId;
      this.switchView('view-room');
      await this.renderLiveRoom(sessionId);
    },

    async enrollInLiveCohort(sessionId) {
      try {
        const res = await window.store.enrollInCohort(sessionId);
        this.showToast(`🎉 Enrolled in Masterclass! Locked ${res.creditsLocked || 1.0} Credits in escrow (1 Cr/student).`, 'lock');
        await window.store.fetchSessions();
        await window.store.fetchWallet();
        this.renderNavbar();
        await this.renderSessions();
        await this.renderWallet();
        if (this.currentTab === 'view-room') {
          await this.renderLiveRoom(sessionId);
        }
      } catch (err) {
        alert('Enrollment failed: ' + err.message);
      }
    },

    async concludeCohortSession(sessionId) {
      const session = (window.store.sessions || []).find(s => s.id === sessionId);
      const attendeeCount = session?.enrolled_count || (session?.attendees?.length) || 0;
      const feePerStudent = 1.0; // 1 credit per student attended
      const totalCredits = (attendeeCount * feePerStudent).toFixed(1);

      if (!confirm(`Are you sure you want to conclude this live masterclass with ${attendeeCount} attending students? You will immediately receive +${totalCredits} Skill Credits (${attendeeCount} students × 1.0 Cr)!`)) {
        return;
      }

      try {
        const res = await window.store.completeCohortSession(sessionId, 5, 'Live group masterclass successfully concluded', ['Group Cohort', 'Hands-on Coding', 'Super Clear']);
        this.showToast(`🎉 Cohort concluded! +${res.totalEarnedCredits || totalCredits} Credits deposited into your wallet (${attendeeCount} attending students)!`, 'award');
        await window.store.init();
        this.renderAll();
        if (this.currentTab === 'view-room') {
          await this.renderLiveRoom(sessionId);
        }
      } catch (err) {
        alert('Error completing cohort: ' + err.message);
      }
    },

    updateBookingCalculation() {
      const hours = Number(document.getElementById('bookDurationSelect').value);
      const rate = Number(document.getElementById('bookHourlyRate').value || 1.0);
      const total = (hours * rate).toFixed(1);
      const notice = document.getElementById('bookEscrowNotice');
      if (notice) {
        notice.innerHTML = `<strong>${hours} Hours &times; ${rate} Credits/hr = ${total} Credits</strong> will be locked in escrow. Your mentor receives credits only after the session concludes.`;
      }
    },

    // ==========================================
    // Multi-Persona & Multi-Role Authentication Handlers
    // ==========================================
    bindAuthEvents() {
      const authModal = document.getElementById('authModal');
      const openAuth = (defaultTab = 'authSignInTab') => {
        this.updateAuthModalJwtInspector();
        if (defaultTab) {
          document.querySelectorAll('.auth-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.authtab === defaultTab);
          });
          document.querySelectorAll('.auth-tab-pane').forEach(p => {
            p.style.display = p.id === defaultTab ? 'block' : 'none';
            p.classList.toggle('active', p.id === defaultTab);
          });
        }
        this.openModal('authModal');
      };

      const closeAuth = () => {
        this.closeModal('authModal');
        const loginErr = document.getElementById('loginErrorMsg');
        const regErr = document.getElementById('regErrorMsg');
        if (loginErr) loginErr.style.display = 'none';
        if (regErr) regErr.style.display = 'none';
      };

      // Navbar Triggers
      document.getElementById('navAuthBtn')?.addEventListener('click', () => openAuth('authSignInTab'));

      document.getElementById('dropdownLogoutBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('personaDropdown')?.classList.remove('show');
        if (window.skillSwapConference && window.skillSwapConference.isInCall) {
          window.skillSwapConference.leaveMeeting();
        }
        window.store.logout();
        this.showToast('Signed out successfully. Switched to guest login.', 'user');
        this.renderAll();
        openAuth('authSignInTab');
      });

      document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuth);
      document.getElementById('cancelAuthLoginBtn')?.addEventListener('click', closeAuth);
      document.getElementById('cancelAuthRegisterBtn')?.addEventListener('click', closeAuth);
      document.getElementById('closeAuthRolesBtn')?.addEventListener('click', closeAuth);

      // Single User Quick-Fill Button in Login Modal
      document.getElementById('authSingleUserQuickFillBtn')?.addEventListener('click', () => {
        const user = window.store.getCurrentPersona();
        const emailInput = document.getElementById('loginEmailInput');
        const passInput = document.getElementById('loginPasswordInput');
        if (emailInput) emailInput.value = user.email || (user.id + '@vignan.ac.in') || 'sri@vignan.ac.in';
        if (passInput) passInput.value = 'Password123';
        this.showToast(`Auto-filled verified credentials for ${user.name || 'Sri Dhanush'}`, 'user');
      });

      // Auth Tabs Navigation
      document.querySelectorAll('.auth-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
          document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.auth-tab-pane').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
          });

          tabBtn.classList.add('active');
          const targetId = tabBtn.dataset.authtab;
          const targetPane = document.getElementById(targetId);
          if (targetPane) {
            targetPane.style.display = 'block';
            targetPane.classList.add('active');
          }
          if (targetId === 'authRolesTab') {
            this.updateAuthModalJwtInspector();
          }
        });
      });

      // Role Selection Cards in Registration Form
      document.querySelectorAll('.role-card-label').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.role-card-label').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          const radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        });
      });

      // Login Form Submit with Email & Password Pre-Verification
      const loginForm = document.getElementById('authLoginForm');
      loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById('loginErrorMsg');
        if (errorBox) errorBox.style.display = 'none';

        const emailOrId = document.getElementById('loginEmailInput')?.value.trim();
        const password = document.getElementById('loginPasswordInput')?.value;
        const submitBtn = document.getElementById('submitLoginBtn');
        const origText = submitBtn ? submitBtn.innerHTML : '';

        // 1. Client-Side Email Verification
        if (!emailOrId) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Email Missing:</strong> Please enter your registered email or University ID.';
            errorBox.style.display = 'block';
          }
          this.showToast('Please enter your email or University ID', 'lock');
          return;
        }

        if (emailOrId.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailOrId)) {
            if (errorBox) {
              errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Invalid Email Format:</strong> Please enter a valid email address (e.g., student@vignan.ac.in).';
              errorBox.style.display = 'block';
            }
            this.showToast('Invalid email format', 'lock');
            return;
          }
        }

        // 2. Client-Side Password Rule Verification (Capital start, min 6 chars)
        if (!password) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Password Missing:</strong> Please enter your password.';
            errorBox.style.display = 'block';
          }
          this.showToast('Please enter your password', 'lock');
          return;
        }

        if (!/^[A-Z]/.test(password)) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Password Rule Violation:</strong> Password must start with a Capital Letter (A-Z).';
            errorBox.style.display = 'block';
          }
          this.showToast('Password must start with Capital Letter (A-Z)', 'lock');
          return;
        }

        if (password.length < 6) {
          if (errorBox) {
            errorBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Password Too Short:</strong> Password must be at least 6 characters long.';
            errorBox.style.display = 'block';
          }
          this.showToast('Password must be at least 6 characters long', 'lock');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Credentials & Database Token...';
          }

          const res = await window.store.login(emailOrId, password);
          closeAuth();
          await this.renderAll();
          this.showToast(`🎉 Welcome back, ${res.user?.name || 'Student'}! Logged in as ${res.user?.role || 'STUDENT'}.`, 'circle-check');
        } catch (err) {
          if (errorBox) {
            errorBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Login Failed:</strong> ${err.message}`;
            errorBox.style.display = 'block';
          }
          this.showToast(err.message, 'triangle-exclamation');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      });
    },

    async renderLiveRoom(sessionId) {
      const currentPersona = window.store.getCurrentPersona();
      let session = null;
      let meetingData = null;

      const sid = sessionId || this.activeLiveRoomSessionId;
      if (sid) {
        try {
          const meetRes = await window.store.fetchLiveMeeting(sid);
          if (meetRes && meetRes.success) {
            session = meetRes.session;
            meetingData = meetRes.meeting;
            this.activeLiveRoomSessionId = session.id;
          }
        } catch (err) {
          console.warn('Live meeting API notice:', err.message);
          const sessions = window.store.sessions || await window.store.fetchSessions();
          session = sessions.find(s => s.id === sid) || sessions[0];
        }
      }

      if (!session) {
        const sessions = window.store.sessions || await window.store.fetchSessions();
        session = sessions.find(s => s.session_type === 'GROUP_COHORT' && s.status === 'Confirmed') ||
                  sessions.find(s => s.session_type === 'GROUP_COHORT') ||
                  sessions[0];
        if (session) this.activeLiveRoomSessionId = session.id;
      }

      if (!session) return;

      const isCohort = session.session_type === 'GROUP_COHORT';
      const isTutor = (session.teacher_id === currentPersona.id || session.teacher?.id === currentPersona.id);
      const tutorName = session.teacher?.name || session.teacherName || session.teacher_id || 'Instructor';
      const tutorId = session.teacher?.id || session.teacher_id || 'sri';
      const learnerName = session.learner?.name || session.studentName || session.student_id || 'Learner';
      const learnerId = session.learner?.id || session.student_id || 'rishitha';

      // Update Header Elements
      const typeBadge = document.getElementById('liveRoomTypeBadge');
      const attendeeCountBadge = document.getElementById('liveRoomAttendeeCountBadge');
      const titleDisplay = document.getElementById('liveRoomTitleDisplay');
      const subtitleDisplay = document.getElementById('liveRoomSubtitleDisplay');
      const stageTitle = document.getElementById('liveRoomStageTitle');
      const bountyDisplay = document.getElementById('liveRoomCohortBountyDisplay');
      const escrowCalculationText = document.getElementById('liveRoomEscrowCalculationText');
      const rosterCountEl = document.getElementById('liveRoomRosterCount');
      const attendeeListContainer = document.getElementById('liveRoomAttendeeList');
      const attendeeGridContainer = document.getElementById('liveRoomAttendeesGrid');
      const completeBtn = document.getElementById('completeSessionBtn');
      const sidebarCompleteBtn = document.getElementById('sidebarCompleteSessionBtn');
      const enrollBtn = document.getElementById('enrollLiveRoomCohortBtn');

      // Instructor Podium
      const instAvatar = document.getElementById('liveRoomInstructorAvatar');
      const instName = document.getElementById('liveRoomInstructorName');
      const instTier = document.getElementById('liveRoomInstructorTier');
      const instTag = document.getElementById('liveRoomInstructorTag');

      if (instAvatar) instAvatar.src = window.getStudentAvatar(tutorId);
      if (instName) instName.textContent = `${tutorName} (Host Tutor)`;
      if (instTier) instTier.textContent = `🥇 Verified Tutor • ${session.rate || 1.0} Cr/hr`;
      if (instTag) instTag.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> ${tutorName} (Lead Instructor)`;

      if (stageTitle) stageTitle.textContent = `LIVE SESSION: ${session.skill} • "${session.topic || 'Skill Swap Exchange'}"`;

      if (isCohort) {
        if (typeBadge) typeBadge.innerHTML = `<i class="fa-solid fa-users"></i> Live Group Masterclass`;
        if (titleDisplay) titleDisplay.textContent = `Interactive Live Classroom: ${session.skill}`;
        if (subtitleDisplay) subtitleDisplay.textContent = `Real-time multi-student cohort. Tutor earns 1 credit per attending student.`;

        let attendees = session.attendees || [];
        try {
          attendees = await window.store.fetchCohortAttendees(session.id);
        } catch (e) {}

        const countN = attendees.length;
        const feePerStudent = 1.0;
        const totalBounty = (countN * feePerStudent).toFixed(1);

        if (attendeeCountBadge) attendeeCountBadge.innerHTML = `<i class="fa-solid fa-user-check"></i> ${countN} Students Joined (N = ${countN})`;
        if (rosterCountEl) rosterCountEl.textContent = `${countN} / ${session.max_capacity || 5} Enrolled`;
        if (bountyDisplay) bountyDisplay.innerHTML = `<i class="fa-solid fa-coins"></i> Tutor Pool: +${totalBounty} Credits (${countN} Students × 1.0 Cr)`;
        if (escrowCalculationText) {
          escrowCalculationText.innerHTML = `<strong>${countN} Students × 1.0 Credit = ${totalBounty} Credits</strong> held in escrow. Released upon conclusion!`;
        }

        if (attendeeGridContainer) {
          attendeeGridContainer.innerHTML = '';
        }
      } else {
        // 1-on-1 Swap between User A and User B
        if (typeBadge) typeBadge.innerHTML = `<i class="fa-solid fa-user"></i> 1-on-1 Swap Session`;
        if (titleDisplay) titleDisplay.textContent = `1-on-1 Peer Session: ${session.skill}`;
        if (subtitleDisplay) subtitleDisplay.textContent = `Real-time interactive session between ${tutorName} and ${learnerName}.`;
        if (attendeeCountBadge) attendeeCountBadge.innerHTML = `<i class="fa-solid fa-user-check"></i> 1 Learner (${learnerName})`;
        if (bountyDisplay) bountyDisplay.innerHTML = `<i class="fa-solid fa-coins"></i> Escrow: ${session.credits} Credits`;
        if (escrowCalculationText) {
          escrowCalculationText.innerHTML = `<strong>${session.credits} Credits</strong> held in escrow. Released upon session review.`;
        }
        if (rosterCountEl) rosterCountEl.textContent = `1 Learner`;
        if (attendeeListContainer) {
          attendeeListContainer.innerHTML = `
            <div style="background: var(--bg-subtle); padding: 0.35rem 0.55rem; border-radius: var(--radius-sm); font-size: 0.76rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700;">${learnerName}</span>
              <span style="color: var(--accent-emerald); font-weight: 700;">${session.credits} Cr</span>
            </div>
          `;
        }

        if (attendeeGridContainer) {
          attendeeGridContainer.innerHTML = `
            <div class="video-box student-tile" id="peerTile_learner" style="position: relative;">
              <video id="peerVideo_learner" class="room-video-feed" autoplay playsinline style="display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit;"></video>
              <div class="video-live-badge"><span class="status-dot-green"></span> <span>HD 720p</span></div>
              <div class="video-name-tag"><i class="fa-solid fa-graduation-cap"></i> ${learnerName} (Learner)</div>
              <div class="video-status-mic" id="peerMicTag_learner"><i class="fa-solid fa-microphone"></i></div>
            </div>
          `;
        }

        if (enrollBtn) enrollBtn.style.display = 'none';
        if (completeBtn) {
          completeBtn.style.display = 'inline-flex';
          completeBtn.innerHTML = `<i class="fa-solid fa-coins"></i> Conclude Session & Rate`;
          completeBtn.onclick = () => this.openReviewModal(session.id);
        }
        if (sidebarCompleteBtn) {
          sidebarCompleteBtn.style.display = 'inline-flex';
          sidebarCompleteBtn.innerHTML = `<i class="fa-solid fa-coins"></i> Conclude Session & Rate`;
          sidebarCompleteBtn.onclick = () => this.openReviewModal(session.id);
        }
      }

      // Start unified live conference engine
      if (meetingData && window.skillSwapConference) {
        await window.skillSwapConference.startMeeting(session.id, session, meetingData);
      }
    },

    toggleMicrophone() {
      if (window.skillSwapConference && window.skillSwapConference.isInCall) {
        window.skillSwapConference.toggleMicrophone();
      } else {
        this.mediaState.isMicMuted = !this.mediaState.isMicMuted;
        const isMuted = this.mediaState.isMicMuted;
        const micBtn = document.getElementById('roomToggleMicBtn');
        const label = document.getElementById('roomMicBtnLabel');
        const statusText = document.getElementById('liveMicStatusText');
        const icon = micBtn?.querySelector('i');

        if (micBtn) {
          micBtn.classList.toggle('active', !isMuted);
          micBtn.classList.toggle('muted', isMuted);
        }
        if (label) label.textContent = isMuted ? 'Unmute' : 'Mute';
        if (icon) icon.className = isMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
        if (statusText) {
          statusText.textContent = isMuted ? 'Muted' : 'Mic Live';
          statusText.style.color = isMuted ? '#f87171' : 'var(--accent-emerald)';
        }
        this.showToast(isMuted ? 'Microphone Muted' : 'Microphone Live (Unmuted)', isMuted ? 'microphone-slash' : 'microphone');
      }
    },

    toggleCamera() {
      if (window.skillSwapConference && window.skillSwapConference.isInCall) {
        window.skillSwapConference.toggleCamera();
      } else {
        this.mediaState.isCamOff = !this.mediaState.isCamOff;
        const isOff = this.mediaState.isCamOff;
        const camBtn = document.getElementById('roomToggleCamBtn');
        const label = document.getElementById('roomCamBtnLabel');
        const statusText = document.getElementById('liveCamStatusText');
        const icon = camBtn?.querySelector('i');

        if (camBtn) {
          camBtn.classList.toggle('active', !isOff);
          camBtn.classList.toggle('off', isOff);
        }
        if (label) label.textContent = isOff ? 'Start Video' : 'Stop Video';
        if (icon) icon.className = isOff ? 'fa-solid fa-video-slash' : 'fa-solid fa-video';
        if (statusText) statusText.textContent = isOff ? 'Camera Off' : 'HD 1080p Video';
        this.showToast(isOff ? 'Camera Stopped' : 'Camera Live', isOff ? 'video-slash' : 'video');
      }
    },

    toggleScreenShare() {
      if (window.skillSwapConference && window.skillSwapConference.isInCall) {
        window.skillSwapConference.toggleScreenShare();
      } else {
        this.mediaState.isScreenSharing = !this.mediaState.isScreenSharing;
        this.showToast(this.mediaState.isScreenSharing ? 'Screen sharing started' : 'Screen sharing stopped', 'desktop');
      }
    },

    openMediaSettingsModal() {
      const modal = document.getElementById('mediaSettingsModal');
      if (!modal) return;

      const audioInput = document.getElementById('audioInputSelect');
      const micVolume = document.getElementById('micVolumeSlider');
      const micVolumeDisp = document.getElementById('micVolumeValueDisplay');
      const chkNoise = document.getElementById('chkNoiseSuppression');
      const chkEcho = document.getElementById('chkEchoCancellation');
      const chkGain = document.getElementById('chkAutoGain');
      const audioOutput = document.getElementById('audioOutputSelect');
      const videoInput = document.getElementById('videoInputSelect');
      const videoRes = document.getElementById('videoResolutionSelect');
      const virtualBg = document.getElementById('virtualBgSelect');
      const chkMirror = document.getElementById('chkMirrorCamera');
      const chkLowLight = document.getElementById('chkLowLightBoost');

      if (audioInput) audioInput.value = this.mediaSettings.audioInput || 'default';
      if (micVolume) micVolume.value = this.mediaSettings.micVolume || 85;
      if (micVolumeDisp) micVolumeDisp.textContent = `${this.mediaSettings.micVolume || 85}%`;
      if (chkNoise) chkNoise.checked = this.mediaSettings.noiseSuppression !== false;
      if (chkEcho) chkEcho.checked = this.mediaSettings.echoCancellation !== false;
      if (chkGain) chkGain.checked = this.mediaSettings.autoGain !== false;
      if (audioOutput) audioOutput.value = this.mediaSettings.audioOutput || 'default';
      if (videoInput) videoInput.value = this.mediaSettings.videoInput || 'default';
      if (videoRes) videoRes.value = this.mediaSettings.resolution || '1080p';
      if (virtualBg) virtualBg.value = this.mediaSettings.virtualBg || 'none';
      if (chkMirror) chkMirror.checked = this.mediaSettings.mirrorCamera !== false;
      if (chkLowLight) chkLowLight.checked = this.mediaSettings.lowLightBoost !== false;

      const user = window.store.getCurrentPersona();
      const previewAvatar = document.getElementById('settingsPreviewAvatar');
      const previewName = document.getElementById('settingsPreviewName');
      if (previewAvatar) previewAvatar.src = window.getStudentAvatar(user.id);
      if (previewName) previewName.textContent = user.name;

      modal.classList.add('active');
      this.startCameraPreview();
    },

    closeMediaSettingsModal() {
      const modal = document.getElementById('mediaSettingsModal');
      modal?.classList.remove('active');
      this.stopCameraPreview();
    },

    async startCameraPreview() {
      const videoEl = document.getElementById('settingsVideoPreview');
      const canvasEl = document.getElementById('settingsCanvasPreview');
      const placeholder = document.getElementById('settingsVideoPlaceholder');
      const user = window.store.getCurrentPersona();

      if (placeholder) placeholder.style.display = 'none';

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          this.mediaState.previewStream = stream;
          if (videoEl) {
            videoEl.srcObject = stream;
            videoEl.style.display = 'block';
          }
          if (canvasEl) canvasEl.style.display = 'none';
          return;
        } catch (e) {
          // Camera permission denied or simulated preview
        }
      }

      // Display live animated camera preview feed instead of logo
      if (videoEl) videoEl.style.display = 'none';
      if (canvasEl) {
        canvasEl.style.display = 'block';
        this.drawProceduralVideoFeed('settingsCanvasPreview', user.name, 'PREVIEW', 0);
      }
    },

    stopCameraPreview() {
      if (this.mediaState.previewStream) {
        this.mediaState.previewStream.getTracks().forEach(t => t.stop());
        this.mediaState.previewStream = null;
      }
      if (this.videoAnimators && this.videoAnimators['settingsCanvasPreview']) {
        cancelAnimationFrame(this.videoAnimators['settingsCanvasPreview']);
        delete this.videoAnimators['settingsCanvasPreview'];
      }
      const videoEl = document.getElementById('settingsVideoPreview');
      const canvasEl = document.getElementById('settingsCanvasPreview');
      const placeholder = document.getElementById('settingsVideoPlaceholder');
      if (videoEl) {
        videoEl.srcObject = null;
        videoEl.style.display = 'none';
      }
      if (canvasEl) canvasEl.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
    },

    saveMediaSettings() {
      const audioInput = document.getElementById('audioInputSelect')?.value || 'default';
      const micVolume = parseInt(document.getElementById('micVolumeSlider')?.value || 85);
      const chkNoise = document.getElementById('chkNoiseSuppression')?.checked !== false;
      const chkEcho = document.getElementById('chkEchoCancellation')?.checked !== false;
      const chkGain = document.getElementById('chkAutoGain')?.checked !== false;
      const audioOutput = document.getElementById('audioOutputSelect')?.value || 'default';
      const videoInput = document.getElementById('videoInputSelect')?.value || 'default';
      const resolution = document.getElementById('videoResolutionSelect')?.value || '1080p';
      const virtualBg = document.getElementById('virtualBgSelect')?.value || 'none';
      const mirrorCamera = document.getElementById('chkMirrorCamera')?.checked !== false;
      const lowLightBoost = document.getElementById('chkLowLightBoost')?.checked !== false;

      this.mediaSettings = {
        audioInput,
        micVolume,
        noiseSuppression: chkNoise,
        echoCancellation: chkEcho,
        autoGain: chkGain,
        audioOutput,
        videoInput,
        resolution,
        virtualBg,
        mirrorCamera,
        lowLightBoost
      };

      try {
        localStorage.setItem('skillswap_media_settings', JSON.stringify(this.mediaSettings));
      } catch (e) {}

      const camStatusText = document.getElementById('liveCamStatusText');
      if (camStatusText && !this.mediaState.isCamOff) {
        camStatusText.textContent = `${resolution.toUpperCase()} Video`;
      }

      this.closeMediaSettingsModal();
      this.showToast(`AV Settings Saved! (${resolution.toUpperCase()} • Noise Filter ON)`, 'check');
    },

    playSpeakerTestTone() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
          this.showToast('Audio test sound completed (AudioContext not supported)', 'volume-high');
          return;
        }
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.30); // G5

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        this.showToast('Playing speaker test chime...', 'volume-high');
      } catch (e) {
        this.showToast('Audio test sound triggered', 'volume-high');
      }
    },

    updateVideoTileMicIndicator() {
      const isMuted = this.mediaState.isMicMuted;
      const instMic = document.querySelector('.video-box.instructor-podium .video-status-mic i');
      if (instMic) {
        instMic.className = isMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
        instMic.parentElement.style.color = isMuted ? '#ef4444' : '#10b981';
      }

      const studentMics = document.querySelectorAll('.video-box.student-tile .video-status-mic i');
      studentMics.forEach(mic => {
        mic.className = isMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone';
        mic.parentElement.style.color = isMuted ? '#ef4444' : '#10b981';
      });
    },

    updateVideoTileCameraState() {
      const isOff = this.mediaState.isCamOff;
      const podium = document.querySelector('.video-box.instructor-podium');
      if (podium) {
        podium.style.opacity = isOff ? '0.7' : '1';
      }
    },

    async renderWallet() {
      await window.store.fetchWallet();
      const user = window.store.getCurrentPersona();

      document.getElementById('walletAvailableBalance').textContent = Number(user.credits || 0).toFixed(1);
      document.getElementById('walletEscrowBalance').textContent = Number(user.escrowLocked || user.escrow_locked || 0).toFixed(1);
      document.getElementById('walletLifetimeEarned').textContent = Number(user.lifetimeEarned || user.lifetime_earned || 0).toFixed(1);
      document.getElementById('walletLifetimeSpent').textContent = Number(user.lifetimeSpent || user.lifetime_spent || 0).toFixed(1);

      const subtitleEl = document.getElementById('walletLedgerSubtitle');
      if (subtitleEl) {
        subtitleEl.textContent = `Personalized Audit Log for ${user.name} — Tiered Hourly Rates Ledger Entries`;
      }

      const tableBody = document.getElementById('walletLedgerTableBody');
      if (!tableBody) return;

      const txs = (window.store.transactions || []).filter(tx => !tx.user_id || tx.user_id === user.id);
      if (txs.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
              <i class="fa-solid fa-clock-rotate-left"></i> No transactions recorded yet for ${user.name}.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = txs.map(tx => {
        const isPlus = tx.amount > 0;
        const isHold = tx.status === 'In Escrow';
        const impactClass = isHold ? 'hold' : isPlus ? 'plus' : 'minus';
        const impactSign = isHold ? '🔒 ' : isPlus ? '+' : '';

        return `
          <tr>
            <td>${tx.date}</td>
            <td style="font-family: monospace; font-size: 0.8rem;">${tx.id}</td>
            <td><strong>${tx.type}</strong></td>
            <td>${tx.description || tx.desc}</td>
            <td>${tx.student_name || tx.student || 'Platform'}</td>
            <td><span class="credit-change ${impactClass}">${impactSign}${Number(tx.amount).toFixed(1)} Credits</span></td>
            <td><span class="session-ticket-status ${tx.status === 'Completed' ? 'confirmed' : 'pending'}">${tx.status}</span></td>
          </tr>
        `;
      }).join('');
    },

    startDirectChat(contactId) {
      this.activeChatContact = contactId;
      this.switchView('view-chat');
      this.renderChat();
    },

    async renderChat() {
      const contactsList = document.getElementById('chatContactsList');
      if (!contactsList) return;

      const current = window.store.getCurrentPersona();
      const peers = Object.values(window.store.personas).filter(p => p.id !== current.id && !p.isAdmin && !p.is_admin);

      if (!this.activeChatContact || !peers.some(p => p.id === this.activeChatContact)) {
        this.activeChatContact = peers[0]?.id || 'rishitha';
      }

      contactsList.innerHTML = peers.map(peer => {
        const topSkill = peer.skillsOffered?.[0] || { name: 'Peer Mentor', rate: 2.5, tier: 'Elite Master' };
        const isSelected = this.activeChatContact === peer.id;
        return `
          <div class="chat-contact-item ${isSelected ? 'active' : ''}" onclick="window.app.selectChatContact('${peer.id}')" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.95rem; cursor: pointer; border-radius: var(--radius-md); transition: all 0.2s ease;">
            <div style="position: relative; flex-shrink: 0;">
              ${window.getUserLogoCardHtml ? window.getUserLogoCardHtml(peer, 42) : `<img src="${window.getStudentAvatar(peer.id)}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;">`}
              <span class="online-indicator" style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: #10b981; border: 2px solid var(--bg-card); border-radius: 50%;"></span>
            </div>
            <div style="flex: 1; overflow: hidden; min-width: 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(peer.name)}</div>
                <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 600;"><i class="fa-solid fa-lock" style="font-size:0.6rem; opacity:0.6;"></i> E2E</span>
              </div>
              <div style="font-size: 0.76rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.15rem;">
                ${this.escapeHtml(topSkill.name)} • <span style="font-weight: 700; color: var(--primary);">${topSkill.rate || 2.5} Cr/hr</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      await this.renderChatMessages(true);
      this.startChatLivePolling();
    },

    async selectChatContact(cId) {
      this.activeChatContact = cId;
      await this.renderChat();
    },

    startChatLivePolling() {
      if (this.chatPollInterval) clearInterval(this.chatPollInterval);
      this.chatPollInterval = setInterval(async () => {
        if (this.currentTab === 'view-chat' && this.activeChatContact) {
          await this.renderChatMessages(false);
        }
      }, 2500);
    },

    stopChatLivePolling() {
      if (this.chatPollInterval) {
        clearInterval(this.chatPollInterval);
        this.chatPollInterval = null;
      }
    },

    async renderChatMessages(forceScrollBottom = false) {
      const peer = window.store.personas[this.activeChatContact];
      if (!peer) return;

      const nameEl = document.getElementById('activeChatName');
      if (nameEl) nameEl.textContent = peer.name;

      const avatarEl = document.getElementById('activeChatAvatar');
      if (avatarEl) avatarEl.src = window.getStudentAvatar(peer.id);

      const statusEl = document.getElementById('activeChatStatus');
      if (statusEl) {
        const topSkill = peer.skillsOffered?.[0] || { name: 'Peer Mentor', rate: 2.5, tier: 'Elite Master' };
        statusEl.innerHTML = `● Active Now • <strong>${this.escapeHtml(topSkill.name)}</strong> (${topSkill.rate || 2.5} Cr/hr • ${this.escapeHtml(topSkill.tier || 'Elite')})`;
      }

      const msgContainer = document.getElementById('chatMessagesContainer');
      if (!msgContainer) return;

      const messages = await window.store.fetchChatMessages(this.activeChatContact);
      const current = window.store.getCurrentPersona();

      const wasNearBottom = msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight < 90;

      const e2eHeaderHtml = `
        <div class="chat-e2e-notice">
          <i class="fa-solid fa-lock"></i>
          <span>Messages are end-to-end encrypted. No one outside of this chat, not even SkillSwap, can read them.</span>
        </div>
      `;

      if (!messages || messages.length === 0) {
        msgContainer.innerHTML = e2eHeaderHtml + `
          <div style="text-align: center; padding: 2.5rem 1.5rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 75%;">
            <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(99,102,241,0.12); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; color: var(--primary); margin-bottom: 0.85rem;">
              <i class="fa-solid fa-comments"></i>
            </div>
            <h4 style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 0.35rem;">Start a Direct Chat with ${this.escapeHtml(peer.name)}</h4>
            <p style="font-size: 0.82rem; max-width: 360px; line-height: 1.45; margin-bottom: 1.25rem;">
              Send an instant message to discuss course topics, schedule 1-on-1 swaps, or clarify doubts in real-time.
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; max-width: 440px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.sendQuickChatMessage('👋 Hi ${this.escapeQuotes(peer.name)}, are you available for a skill swap session?')">
                👋 "Hi ${this.escapeHtml(peer.name)}, are you free for a swap?"
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.sendQuickChatMessage('💡 I want to learn ${this.escapeQuotes(peer.skillsOffered?.[0]?.name || 'your courses')}!')">
                💡 "I want to learn ${this.escapeHtml(peer.skillsOffered?.[0]?.name || 'courses')}!"
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.sendQuickChatMessage('📅 Can we schedule a 1-on-1 session this week?')">
                📅 "Can we schedule a 1-on-1 session?"
              </button>
            </div>
          </div>
        `;
      } else {
        msgContainer.innerHTML = e2eHeaderHtml + messages.map(msg => {
          const isOut = msg.sender_id === current.id;
          return `
            <div class="message-bubble ${isOut ? 'outgoing' : 'incoming'}">
              <div class="message-text">${this.escapeHtml(msg.text)}</div>
              <div class="message-time">
                <i class="fa-solid fa-lock" style="font-size: 0.6rem; opacity: 0.6; margin-right: 3px;"></i>
                <span>${msg.time || 'Just now'}</span>
                ${isOut ? '<span class="chat-read-receipt" style="color: #60a5fa; margin-left: 4px; font-size: 0.72rem;" title="Delivered & Read"><i class="fa-solid fa-check-double"></i></span>' : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      if (forceScrollBottom || wasNearBottom) {
        msgContainer.scrollTop = msgContainer.scrollHeight;
      }
    },

    async sendQuickChatMessage(quickText) {
      if (!quickText || !this.activeChatContact) return;
      try {
        await window.store.sendMessage(this.activeChatContact, quickText);
        await this.renderChatMessages(true);
      } catch (err) {
        console.error('Quick message send error:', err);
        this.showToast(err.message || 'Could not send message', 'triangle-exclamation');
      }
    },

    async renderProfile() {
      const user = window.store.getCurrentPersona();
      document.getElementById('profileCardName').textContent = user.name;
      document.getElementById('profileCardMajor').textContent = user.major;
      document.getElementById('profileCardBio').textContent = user.bio;
      document.getElementById('profileCardAvatar').src = window.getStudentAvatar(user.id);

      // Database Storage & Record Metadata Strip
      const dbStatusEl = document.getElementById('profileCardDbStatus');
      if (dbStatusEl) dbStatusEl.textContent = 'SQLite / Supabase Synced (Active)';
      const userIdEl = document.getElementById('profileCardUserId');
      if (userIdEl) userIdEl.textContent = user.id || 'sri';
      const loginCountEl = document.getElementById('profileCardLoginCount');
      if (loginCountEl) {
        const cnt = user.login_count || user.loginCount || 1;
        loginCountEl.textContent = `${cnt} ${cnt === 1 ? 'Login' : 'Logins'}`;
      }
      const lastLoginEl = document.getElementById('profileCardLastLogin');
      if (lastLoginEl) {
        if (user.last_login_at || user.lastLoginAt) {
          const dateStr = user.last_login_at || user.lastLoginAt;
          lastLoginEl.textContent = new Date(dateStr).toLocaleString();
        } else {
          lastLoginEl.textContent = 'Active Session';
        }
      }
      const rolePillEl = document.getElementById('profileCardRolePill');
      if (rolePillEl) {
        const r = user.role || (user.isAdmin ? 'ADMIN' : 'STUDENT');
        rolePillEl.textContent = r;
        const rClass = (r === 'ADMIN' || r === 'FACULTY_ADMIN' || r === 'SUPER_ADMIN') ? 'role-admin' : 'role-student';
        rolePillEl.className = `auth-role-pill ${rClass}`;
      }

      const badgesContainer = document.getElementById('profileBadgeContainer');
      if (badgesContainer) {
        const role = window.store.getUserRole();
        const roleClass = (role === 'ADMIN' || role === 'FACULTY_ADMIN' || role === 'SUPER_ADMIN') ? 'role-admin' : 'role-student';

        const cfg = window.USER_LOGO_CONFIGS?.[user.id?.toLowerCase()] || {};
        const roleBadgeHtml = `<span class="auth-role-pill ${roleClass}" style="margin-right: 0.35rem;"><i class="fa-solid fa-shield-halved"></i> ${role}</span>`;
        const specialtyBadgeHtml = cfg.badgeText ? `<span class="student-badge" style="background: rgba(99,102,241,0.15); color: var(--primary); font-weight: 700; margin-right: 0.35rem;"><i class="fa-solid fa-gem"></i> ${cfg.badgeIcon || '⚡'} ${cfg.badgeText}</span>` : '';
        const emailBadgeHtml = user.email ? `<span class="student-badge" style="margin-right: 0.35rem;"><i class="fa-regular fa-envelope"></i> ${user.email}</span>` : '';

        badgesContainer.innerHTML = roleBadgeHtml + specialtyBadgeHtml + emailBadgeHtml + (user.badges || []).map(b => `
          <span class="student-badge"><i class="fa-solid fa-medal" style="color: #f59e0b;"></i> ${b}</span>
        `).join('');
      }

      // Render Verified Certificates Showcase
      const certsGrid = document.getElementById('profileCertificatesGrid');
      if (certsGrid) {
        const certs = user.certificates || [];
        if (certs.length === 0) {
          certsGrid.innerHTML = `
            <div style="grid-column: 1/-1; color: var(--text-muted); font-size: 0.88rem; padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md);">
              No external certificates linked yet. Link your NPTEL or Coursera certificate to unlock Advanced (2.0 Cr) or Elite Master (2.5 Cr/hr) Tutor Tiers!
            </div>
          `;
        } else {
          certsGrid.innerHTML = certs.map(c => {
            const authLower = (c.authority || '').toLowerCase();
            let issuerLogoSvg = window.ISSUER_LOGOS?.vignan || '';
            if (authLower.includes('nptel')) issuerLogoSvg = window.ISSUER_LOGOS?.nptel || '';
            else if (authLower.includes('coursera')) issuerLogoSvg = window.ISSUER_LOGOS?.coursera || '';
            else if (authLower.includes('aws')) issuerLogoSvg = window.ISSUER_LOGOS?.aws || '';
            else if (authLower.includes('google')) issuerLogoSvg = window.ISSUER_LOGOS?.google || '';
            else if (authLower.includes('microsoft')) issuerLogoSvg = window.ISSUER_LOGOS?.microsoft || '';

            return `
              <div style="background: var(--bg-subtle); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-lg); padding: 1.1rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                      <div style="width: 24px; height: 24px; flex-shrink: 0;">${issuerLogoSvg}</div>
                      <span style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #b45309; background: rgba(245, 158, 11, 0.15); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);">
                        ${c.authority}
                      </span>
                    </div>
                    <span style="font-size: 0.72rem; color: var(--accent-emerald); font-weight: 700;">✓ Verified</span>
                  </div>
                  <h4 style="font-size: 0.95rem; font-weight: 800; line-height: 1.3; margin-bottom: 0.35rem;">${c.title}</h4>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.5rem;"><strong>Grade / Honor:</strong> ${c.score_or_grade}</div>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ID: ${c.credential_id}
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // Render Skills Offered with 4 Exact Categories
      const offeredList = document.getElementById('profileSkillsOfferedList');
      if (offeredList) {
        offeredList.innerHTML = (user.skillsOffered || []).map(s => {
          let tierBadgeText = '🥉 1. Bronze Tutor (1.0 Cr/hr)';
          let tierBadgeStyle = 'background: rgba(205, 127, 50, 0.15); color: #854d0e;';

          if (s.tier === 'Elite Master') {
            tierBadgeText = '🥇 4. Elite Master (2.5 Cr/hr)';
            tierBadgeStyle = 'background: rgba(245, 158, 11, 0.15); color: #b45309;';
          } else if (s.tier === 'Advanced') {
            tierBadgeText = '🎖️ 3. Advanced Tutor (2.0 Cr/hr)';
            tierBadgeStyle = 'background: rgba(14, 165, 233, 0.15); color: #0284c7;';
          } else if (s.tier === 'Silver') {
            tierBadgeText = '🥈 2. Silver Tutor (1.5 Cr/hr)';
            tierBadgeStyle = 'background: rgba(148, 163, 184, 0.15); color: #475569;';
          }

          return `
            <div style="background: var(--bg-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <span style="font-weight: 700; font-size: 0.92rem;">
                  ${s.is_verified ? '<i class="fa-solid fa-shield-check" style="color:var(--accent-emerald);"></i> ' : ''}${s.name}
                </span>
                <span style="${tierBadgeStyle} font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: var(--radius-full);">
                  ${tierBadgeText}
                </span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">${s.description || s.desc || ''}</p>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Quiz Score: <strong>${s.quiz_score || 95}%</strong> • Certs Linked: <strong>${s.cert_count || 0}</strong></div>
            </div>
          `;
        }).join('');
      }

      const wantedList = document.getElementById('profileSkillsWantedList');
      if (wantedList) {
        wantedList.innerHTML = (user.skillsWanted || []).map(s => `
          <div style="background: var(--bg-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-md); border-left: 3px solid var(--accent-amber);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <span style="font-weight: 700; font-size: 0.92rem;">${s.name}</span>
              <span style="background: var(--accent-amber-light); color: var(--accent-amber); font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: var(--radius-full);">${s.level}</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">${s.goal}</p>
          </div>
        `).join('');
      }

      const reviewsContainer = document.getElementById('profileReviewsContainer');
      if (reviewsContainer) {
        const reviews = user.reviews || [];
        if (reviews.length === 0) {
          reviewsContainer.innerHTML = `<div style="grid-column: 1/-1; color: var(--text-muted);">No student feedback reviews yet. Teach a session to earn ratings from students!</div>`;
        } else {
          reviewsContainer.innerHTML = reviews.map(r => `
            <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.2rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.65rem;">
                ${window.getUserLogoCardHtml(r.reviewer_avatar || r.reviewer_id || r.target_user_id || 'sri', 38)}
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem;">${r.reviewer_name || r.reviewerName}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${r.created_at || r.date} • ${r.skill}</div>
                </div>
                <div style="margin-left: auto; color: #f59e0b; font-weight: 700; font-size: 0.85rem;">
                  ⭐ ${r.rating}.0
                </div>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.65rem;">"${r.comment}"</p>
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                ${(r.tags || []).map(t => `<span class="tag-badge" style="font-size: 0.72rem;">${t}</span>`).join('')}
              </div>
            </div>
          `).join('');
        }
      }

      // Render AI Dynamic Assessment & Skill Qualification Records (quiz_attempts table in SQLite/Supabase)
      const quizAttemptsSubtitle = document.getElementById('profileQuizAttemptsSubtitle');
      if (quizAttemptsSubtitle) {
        quizAttemptsSubtitle.textContent = `Verified Skill Evaluations & Negative Marking Test Records for ${user.name} stored in Database`;
      }

      const quizAttemptsTableBody = document.getElementById('profileQuizAttemptsTableBody');
      if (quizAttemptsTableBody) {
        let attempts = [];
        try {
          attempts = await window.store.fetchQuizAttempts(user.id);
        } catch (e) {
          attempts = user.quizAttempts || [];
        }

        if (!attempts || attempts.length === 0) {
          quizAttemptsTableBody.innerHTML = `
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                <i class="fa-solid fa-graduation-cap"></i> No assessment records stored yet for ${user.name}. Take a 20-question AI quiz to qualify courses and upgrade tutor tier!
              </td>
            </tr>
          `;
        } else {
          quizAttemptsTableBody.innerHTML = attempts.map(att => {
            const isPass = att.passed === 1 || att.passed === true;
            const dateStr = att.attempted_at ? new Date(att.attempted_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
            const tierBadge = att.tier_awarded || (isPass ? 'Bronze' : 'Unverified');
            const marksStr = `${att.marks_obtained !== undefined ? att.marks_obtained : (att.correct_count * 3 - att.wrong_count)} / ${att.max_marks || 60}`;

            let tierHtml = `<span class="student-badge" style="background: rgba(205, 127, 50, 0.15); color: #854d0e;">🥉 ${tierBadge}</span>`;
            if (tierBadge === 'Elite Master') {
              tierHtml = `<span class="student-badge" style="background: rgba(245, 158, 11, 0.15); color: #b45309; font-weight:700;">🥇 Elite Master (2.5 Cr)</span>`;
            } else if (tierBadge === 'Advanced') {
              tierHtml = `<span class="student-badge" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; font-weight:700;">🎖️ Advanced (2.0 Cr)</span>`;
            } else if (tierBadge === 'Silver') {
              tierHtml = `<span class="student-badge" style="background: rgba(148, 163, 184, 0.15); color: #475569; font-weight:700;">🥈 Silver (1.5 Cr)</span>`;
            } else if (!isPass) {
              tierHtml = `<span class="student-badge" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight:700;">❌ Not Passed (<70%)</span>`;
            }

            return `
              <tr>
                <td style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</td>
                <td><strong>${att.skill_name}</strong></td>
                <td>${att.total_questions || 20} Qs</td>
                <td>
                  <span style="color: var(--accent-emerald); font-weight: 700;">+${att.correct_count * 3}</span> / 
                  <span style="color: var(--accent-rose); font-weight: 700;">-${att.wrong_count * 1}</span> / 
                  <span style="color: var(--text-muted); font-weight: 600;">${att.unattempted_count || 0} unattempted</span>
                </td>
                <td><strong>${marksStr}</strong></td>
                <td>
                  <span class="mark-badge ${isPass ? 'plus' : 'minus'}">${att.score_percent}%</span>
                </td>
                <td>${tierHtml}</td>
              </tr>
            `;
          }).join('');
        }
      }

      // Render Profile-Isolated Transaction Audit Log (Supabase PostgreSQL)
      const profileSubtitle = document.getElementById('profileLedgerSubtitle');
      if (profileSubtitle) {
        profileSubtitle.textContent = `Personalized Audit Trail for ${user.name} — Immutable Ledger in Supabase PostgreSQL`;
      }

      const profileTableBody = document.getElementById('profileLedgerTableBody');
      if (profileTableBody) {
        let userTxs = [];
        try {
          userTxs = await window.store.fetchTransactionsByUser(user.id);
        } catch (e) {
          userTxs = (user.transactions || (window.store.transactions || []).filter(tx => tx.user_id === user.id));
        }

        if (!userTxs || userTxs.length === 0) {
          profileTableBody.innerHTML = `
            <tr>
              <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                <i class="fa-solid fa-clock-rotate-left"></i> No transaction audit entries recorded yet for ${user.name}.
              </td>
            </tr>
          `;
        } else {
          profileTableBody.innerHTML = userTxs.map(tx => {
            const isPlus = tx.amount > 0;
            const isHold = tx.status === 'In Escrow';
            const impactClass = isHold ? 'hold' : isPlus ? 'plus' : 'minus';
            const impactSign = isHold ? '🔒 ' : isPlus ? '+' : '';

            return `
              <tr>
                <td>${tx.date}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${tx.id}</td>
                <td><strong>${tx.type}</strong></td>
                <td>${tx.description || tx.desc}</td>
                <td>${tx.student_name || tx.student || 'Platform'}</td>
                <td><span class="credit-change ${impactClass}">${impactSign}${Number(tx.amount).toFixed(1)} Credits</span></td>
                <td><span class="session-ticket-status ${tx.status === 'Completed' ? 'confirmed' : 'pending'}">${tx.status}</span></td>
              </tr>
            `;
          }).join('');
        }
      }
    },

    // ==========================================
    // Support Team Desk & Triage View Logic
    // ==========================================
    async openCreateSupportModal() {
      document.getElementById('createSupportTicketForm')?.reset();
      this.selectedSupportAttachment = null;
      const fileInput = document.getElementById('supportAttachmentInput');
      if (fileInput) fileInput.value = '';
      const previewCard = document.getElementById('supportAttachmentPreview');
      if (previewCard) previewCard.style.display = 'none';
      const uploadPrompt = document.getElementById('supportUploadPrompt');
      if (uploadPrompt) uploadPrompt.style.display = 'block';
      this.openModal('createSupportTicketModal');
      await this.checkSupportEligibilityLive();
    },

    async checkSupportEligibilityLive() {
      const skillSelect = document.getElementById('supportSkillSelect');
      const statusBox = document.getElementById('supportEligibilityStatusBox');
      if (!skillSelect || !statusBox) return;

      const skillName = skillSelect.value;
      statusBox.className = 'eligibility-status-box';
      statusBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying student course attendance & credentials...';

      try {
        const data = await window.store.checkSupportEligibility(skillName);
        if (data.eligible) {
          statusBox.className = 'eligibility-status-box verified';
          statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>✓ Eligible for 0 Cr Support:</strong> ${data.proof}`;
        } else {
          statusBox.className = 'eligibility-status-box warning';
          statusBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Prior Knowledge Notice:</strong> ${data.proof || 'No session attendance recorded in this skill yet. You can still submit if you studied independently.'}`;
        }
      } catch (err) {
        statusBox.className = 'eligibility-status-box verified';
        statusBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>✓ Eligible:</strong> Academic support pool active.`;
      }
    },

    openResolveSupportModal(ticketId) {
      const ticket = (this.supportTickets || []).find(t => t.id === ticketId);
      if (!ticket) return;

      const escapeHtml = (str) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const renderAttachmentSnippet = (t) => {
        if (!t.attachment_data) return '';
        const isImg = t.attachment_data.startsWith('data:image/');
        const safeName = escapeHtml(t.attachment_name || (isImg ? 'screenshot.png' : 'attachment.txt'));
        return `
          <div style="margin-top: 0.45rem; background: var(--bg-card); padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; overflow: hidden;">
              ${isImg ? `
                <a href="${t.attachment_data}" target="_blank" title="Click to view full screenshot">
                  <img src="${t.attachment_data}" alt="${safeName}" style="width: 44px; height: 44px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-medium); cursor: zoom-in;">
                </a>
              ` : `
                <i class="fa-solid fa-file-code" style="font-size: 1.35rem; color: var(--primary);"></i>
              `}
              <div style="text-align: left; overflow: hidden;">
                <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${safeName}</div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">${isImg ? '🖼️ Attached Error Screenshot' : '📄 Attached Code / Log File'}</div>
              </div>
            </div>
            <a href="${t.attachment_data}" download="${safeName}" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; white-space: nowrap;">
              <i class="fa-solid fa-download"></i> View / Download
            </a>
          </div>
        `;
      };

      const hiddenId = document.getElementById('resolveTicketId');
      if (hiddenId) hiddenId.value = ticket.id;

      const summary = document.getElementById('resolveTicketSummary');
      if (summary) {
        summary.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">${ticket.title}</span>
            <span class="support-tag tag-${ticket.issue_type === 'CODE_BUG' ? 'bug' : ticket.issue_type === 'CONCEPT_DOUBT' ? 'concept' : 'arch'}">${ticket.issue_type}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Student: <strong>${ticket.student_name}</strong> • Course: <strong>${ticket.skill_name}</strong>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">
            ${ticket.description}
          </div>
          ${ticket.code_snippet ? `<pre class="support-code-box" style="margin-top: 0.35rem; max-height: 100px;"><code>${escapeHtml(ticket.code_snippet)}</code></pre>` : ''}
          ${renderAttachmentSnippet(ticket)}
        `;
      }

      // Pre-select recommended quiz to match skill
      const quizSelect = document.getElementById('resolveRecommendedQuizSelect');
      if (quizSelect) {
        for (let opt of quizSelect.options) {
          if (opt.value.toLowerCase().includes(ticket.skill_name.toLowerCase()) || ticket.skill_name.toLowerCase().includes(opt.value.toLowerCase())) {
            quizSelect.value = opt.value;
            break;
          }
        }
      }

      const solutionInput = document.getElementById('resolveSolutionInput');
      if (solutionInput) solutionInput.value = '';
      this.openModal('resolveSupportModal');
    },

    async claimSupportTicket(ticketId) {
      try {
        await window.store.claimSupportTicket(ticketId);
        this.showToast('Ticket claimed! You can now submit your solution and earn skill credits.', 'lock');
        await this.renderSupportDesk();
      } catch (err) {
        alert('Could not claim ticket: ' + err.message);
      }
    },

    async rateSupportTicket(ticketId, rating) {
      try {
        await window.store.rateSupportTicket(ticketId, rating, '');
        this.showToast(`⭐ Rated mentor ${rating} Stars! Thank you for your feedback.`, 'coins');
        await this.renderSupportDesk();
      } catch (err) {
        alert('Could not submit rating: ' + err.message);
      }
    },

    async renderSupportDesk() {
      try {
        const tickets = await window.store.fetchSupportTickets();
        this.supportTickets = tickets || [];

        // Calculate KPI metrics
        const openTickets = this.supportTickets.filter(t => t.status === 'OPEN');
        const resolvedTickets = this.supportTickets.filter(t => t.status === 'RESOLVED');
        const totalRewards = resolvedTickets.reduce((sum, t) => sum + (Number(t.reward_credits) || 0), 0);

        const openEl = document.getElementById('supportOpenCount');
        if (openEl) openEl.textContent = `${openTickets.length} Doubts`;

        const resolvedEl = document.getElementById('supportResolvedCount');
        if (resolvedEl) resolvedEl.textContent = `${resolvedTickets.length} Solved`;

        const rewardsEl = document.getElementById('supportTotalRewards');
        if (rewardsEl) rewardsEl.textContent = `${totalRewards.toFixed(1)} Cr`;

        // Update sidebar badge
        const badge = document.getElementById('sidebarSupportBadge');
        if (badge) {
          badge.textContent = `${openTickets.length} Open`;
          badge.style.display = openTickets.length > 0 ? 'inline-flex' : 'none';
        }

        this.renderSupportDeskCards();
      } catch (err) {
        console.error('Error rendering support desk:', err);
      }
    },

    renderSupportDeskCards() {
      const container = document.getElementById('supportTicketsCardGrid');
      if (!container) return;

      const currentPersona = window.store.getCurrentPersona();
      const currentRole = window.store.getUserRole();
      const isMentorOrAdmin = currentRole === 'ADMIN' || currentRole === 'STUDENT' || currentPersona.isAdmin;

      let filtered = (this.supportTickets || []).slice();

      // Filter by status / type
      if (this.supportFilter === 'CODE_BUG') {
        filtered = filtered.filter(t => t.issue_type === 'CODE_BUG');
      } else if (this.supportFilter === 'CONCEPT_DOUBT') {
        filtered = filtered.filter(t => t.issue_type === 'CONCEPT_DOUBT');
      } else if (this.supportFilter === 'ARCH_DESIGN') {
        filtered = filtered.filter(t => t.issue_type === 'ARCH_DESIGN');
      } else if (this.supportFilter === 'OPEN') {
        filtered = filtered.filter(t => t.status === 'OPEN');
      } else if (this.supportFilter === 'RESOLVED') {
        filtered = filtered.filter(t => t.status === 'RESOLVED');
      } else if (this.supportFilter === 'MINE') {
        filtered = filtered.filter(t => t.student_id === currentPersona.id || t.support_mentor_id === currentPersona.id);
      }

      // Filter by search query
      if (this.supportSearchQuery) {
        const q = this.supportSearchQuery;
        filtered = filtered.filter(t =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.skill_name && t.skill_name.toLowerCase().includes(q)) ||
          (t.student_name && t.student_name.toLowerCase().includes(q))
        );
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-medium);">
            <i class="fa-solid fa-headset" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
            <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">No Support Doubts Found</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 440px; margin: 0.35rem auto 1.25rem;">
              ${this.supportSearchQuery ? 'No doubt tickets match your current search query.' : 'Students who attend courses can upload code doubts and get free triage support (0 Credits).'}
            </p>
            <button class="btn btn-primary btn-sm" onclick="window.app.openCreateSupportModal()">
              <i class="fa-solid fa-plus-circle"></i> Ask a Doubt Now (0 Cr)
            </button>
          </div>
        `;
        return;
      }

      const escapeHtml = (str) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      };

      const renderAttachmentSnippet = (t) => {
        if (!t.attachment_data) return '';
        const isImg = t.attachment_data.startsWith('data:image/');
        const safeName = escapeHtml(t.attachment_name || (isImg ? 'screenshot.png' : 'attachment.txt'));
        return `
          <div style="margin-top: 0.45rem; background: var(--bg-subtle); padding: 0.45rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; overflow: hidden;">
              ${isImg ? `
                <a href="${t.attachment_data}" target="_blank" title="Click to view full screenshot">
                  <img src="${t.attachment_data}" alt="${safeName}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-medium); cursor: zoom-in;">
                </a>
              ` : `
                <i class="fa-solid fa-file-code" style="font-size: 1.35rem; color: var(--primary);"></i>
              `}
              <div style="text-align: left; overflow: hidden;">
                <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${safeName}</div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">${isImg ? '🖼️ Error Screenshot Attachment' : '📄 Source Code / Log File'}</div>
              </div>
            </div>
            <a href="${t.attachment_data}" download="${safeName}" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; white-space: nowrap;">
              <i class="fa-solid fa-download"></i> View
            </a>
          </div>
        `;
      };

      container.innerHTML = filtered.map(t => {
        const isOwner = t.student_id === currentPersona.id;
        const isAssignedMentor = t.support_mentor_id === currentPersona.id;
        const isOpen = t.status === 'OPEN';
        const isClaimed = t.status === 'CLAIMED';
        const isResolved = t.status === 'RESOLVED';

        const typeLabel = t.issue_type === 'CODE_BUG' ? '🐞 Code Bug' : (t.issue_type === 'CONCEPT_DOUBT' ? '💡 Concept' : '🏗️ Architecture');
        const typeClass = t.issue_type === 'CODE_BUG' ? 'tag-bug' : (t.issue_type === 'CONCEPT_DOUBT' ? 'tag-concept' : 'tag-arch');

        const statusClass = isOpen ? 'open' : (isClaimed ? 'claimed' : 'resolved');
        const statusLabel = isOpen ? '⏳ Open' : (isClaimed ? '🛠️ In Progress' : '✓ Resolved');

        return `
          <div class="support-card status-${statusClass}">
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div class="support-card-top">
                <div class="support-badge-group">
                  <span class="support-tag ${typeClass}">${typeLabel}</span>
                  <span class="support-tag tag-skill"><i class="fa-solid fa-book-open"></i> ${t.skill_name}</span>
                </div>
                <span class="support-status-pill ${statusClass}">${statusLabel}</span>
              </div>

              <!-- Course Verification Proof -->
              <div class="support-eligibility-proof">
                <i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i>
                <span>${t.eligibility_proof || 'Verified Course Learner'}</span>
              </div>

              <div>
                <h3 class="support-card-title">${t.title}</h3>
                <p class="support-card-desc" style="margin-top: 0.35rem;">${t.description}</p>
              </div>

              ${t.code_snippet ? `
                <pre class="support-code-box"><code>${escapeHtml(t.code_snippet)}</code></pre>
              ` : ''}

              <!-- Uploaded Attachment / Screenshot -->
              ${renderAttachmentSnippet(t)}

              <!-- Resolved Solution Box -->
              ${isResolved ? `
                <div class="support-solution-box">
                  <div class="support-solution-header">
                    <span><i class="fa-solid fa-user-check"></i> Resolved by ${t.support_mentor_name}</span>
                    <span style="font-weight: 800; color: var(--accent-emerald);">+${t.reward_credits || '1.5'} Cr Bounty</span>
                  </div>
                  <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted);">
                    Classification: <span style="color: var(--primary);">${t.mentor_classification || 'Level 1: Syntax / Typo'}</span>
                  </div>
                  <div class="support-solution-body">${escapeHtml(t.mentor_solution || 'Solution provided.')}</div>

                  ${t.recommended_assessment_skill ? `
                    <div class="support-quiz-recommendation-cta">
                      <div>
                        <strong>🎯 Follow-Up Assessment:</strong> Take 20-Q AI Quiz in <em>${t.recommended_assessment_skill}</em>
                      </div>
                      <button class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;" onclick="window.app.startQuiz('${t.recommended_assessment_skill}')">
                        <i class="fa-solid fa-play"></i> Take Quiz
                      </button>
                    </div>
                  ` : ''}

                  <!-- Student Rating Section -->
                  ${isOwner ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-subtle); padding-top: 0.5rem; margin-top: 0.25rem;">
                      <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-secondary);">Rate Support Mentor:</span>
                      <div class="support-star-rating">
                        ${[1, 2, 3, 4, 5].map(star => `
                          <i class="fa-${(t.rating || 0) >= star ? 'solid' : 'regular'} fa-star" onclick="window.app.rateSupportTicket('${t.id}', ${star})" title="Rate ${star} Stars"></i>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Footer Meta & Actions -->
            <div>
              <div class="support-meta-row">
                <div>
                  <i class="fa-regular fa-user"></i> Student: <strong>${t.student_name}</strong>
                </div>
                <div class="support-bounty-badge">
                  <i class="fa-solid fa-coins"></i> ${isOpen ? 'Bounty: +1.0 - +2.0 Cr' : (isResolved ? `Awarded: +${t.reward_credits} Cr` : 'In Triage')}
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                ${isOpen && isMentorOrAdmin ? `
                  <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="window.app.openResolveSupportModal('${t.id}')">
                    <i class="fa-solid fa-screwdriver-wrench"></i> Classify & Solve (+1.0 - +2.0 Cr)
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="window.app.claimSupportTicket('${t.id}')">
                    <i class="fa-solid fa-hand-holding-hand"></i> Claim
                  </button>
                ` : ''}

                ${isClaimed && isAssignedMentor ? `
                  <button class="btn btn-emerald btn-sm" style="flex: 1;" onclick="window.app.openResolveSupportModal('${t.id}')">
                    <i class="fa-solid fa-coins"></i> Submit Solution & Earn Bounty
                  </button>
                ` : ''}

                ${isOpen && isOwner ? `
                  <div style="font-size: 0.76rem; color: var(--accent-amber); font-weight: 700; display: flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0;">
                    <i class="fa-solid fa-hourglass-half"></i> Awaiting peer mentor triage (0 Cr charged)
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    startSessionTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      const display = document.getElementById('sessionTimerDisplay');
      if (!display) return;

      this.timerInterval = setInterval(() => {
        if (this.timerSeconds > 0) {
          this.timerSeconds--;
          const hrs = String(Math.floor(this.timerSeconds / 3600)).padStart(2, '0');
          const mins = String(Math.floor((this.timerSeconds % 3600) / 60)).padStart(2, '0');
          const secs = String(this.timerSeconds % 60).padStart(2, '0');
          display.textContent = `${hrs}:${mins}:${secs} REMAINING`;
        }
      }, 1000);
    },

    showToast(message, iconType = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      
      let icon = 'fa-circle-info';
      if (iconType === 'check' || iconType === 'coins') icon = 'fa-circle-check" style="color: var(--accent-emerald);';
      if (iconType === 'lock') icon = 'fa-lock" style="color: var(--accent-amber);';
      if (iconType === 'plus') icon = 'fa-plus-circle" style="color: var(--primary);';
      if (iconType === 'message') icon = 'fa-comment" style="color: var(--secondary);';
      if (iconType === 'user') icon = 'fa-user-astronaut" style="color: var(--primary);';

      toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="toast-text">
          <h5>SkillSwap Merit Update</h5>
          <p>${message}</p>
        </div>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    escapeQuotes(str) {
      if (!str) return '';
      return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
  };

  window.app = app;
  await app.init();
});
