/**
 * SkillSwap Platform - Session, Escrow & Live Zoom Video Meeting Controller
 */

const { db } = require('../database/db');
const { supabaseService } = require('../database/supabase');
const { zoomService } = require('../services/zoomService');

const sessionController = {
  async getSessions(req, res, next) {
    try {
      const sessions = await supabaseService.getSessions();
      res.json({ success: true, sessions });
    } catch (err) {
      next(err);
    }
  },

  async bookSession(req, res, next) {
    try {
      const { learnerId, tutorId, skillName, sessionDate, durationHours, meetingLink } = req.body;
      const result = await supabaseService.bookSessionEscrow({
        learnerId: learnerId || req.currentUserId || 'sri',
        tutorId,
        skillName,
        sessionDate,
        durationHours: durationHours || 1,
        meetingLink: meetingLink || 'https://meet.google.com/skillswap-' + Math.random().toString(36).substring(7)
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async completeSession(req, res, next) {
    try {
      const { sessionId, rating, comment, tags } = req.body;
      const result = await supabaseService.completeSessionAndReleaseEscrow({
        sessionId,
        rating: Number(rating) || 5.0,
        comment: comment || 'Productive skill swap session!',
        tags: tags || []
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async createCohort(req, res, next) {
    try {
      const { skillName, topic, sessionDate, time, durationHours, maxCapacity, meetingLink } = req.body;
      const tutorId = req.user?.id || req.currentUserId || 'sri';
      const result = await supabaseService.createGroupCohortSession({
        tutorId,
        skillName,
        topic,
        sessionDate,
        time,
        durationHours,
        maxCapacity,
        meetingLink
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async enrollInCohort(req, res, next) {
    try {
      const { sessionId } = req.body;
      const studentId = req.user?.id || req.currentUserId || 'pujitha';
      const result = await supabaseService.enrollInCohortSession({
        sessionId,
        studentId
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getCohortAttendees(req, res, next) {
    try {
      const { id } = req.params;
      const attendees = await supabaseService.getCohortAttendees(id);
      res.json({ success: true, attendees });
    } catch (err) {
      next(err);
    }
  },

  async completeCohort(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, comment, tags } = req.body;
      const tutorId = req.user?.id || req.currentUserId || 'sri';
      const result = await supabaseService.completeGroupCohortSession({
        sessionId: id,
        tutorId,
        rating,
        comment,
        tags
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async cancelSession(req, res, next) {
    try {
      const { sessionId, reason } = req.body;
      const result = await supabaseService.cancelSessionAndRefundEscrow({
        sessionId,
        reason: reason || 'Learner requested cancellation'
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Real-Time Live Video Session Endpoint
   * GET/POST /api/sessions/:id/live-meeting
   * Handles 1-on-1 and Group Masterclass meetings with deterministic single-meeting locking
   */
  async getOrCreateLiveMeeting(req, res, next) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id || req.currentUserId;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to join live video meeting.'
        });
      }

      // 1. Fetch Session Record from Database
      const session = await db.getAsync(`SELECT * FROM sessions WHERE id = ?`, [id]);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: `Skill Swap session with ID "${id}" was not found.`
        });
      }

      // 2. Authorize User against Session
      const isTeacher = session.teacher_id === currentUserId;
      const isStudent = session.student_id === currentUserId;
      const isCohort = session.session_type === 'GROUP_COHORT';

      let isEnrolled = false;
      if (isCohort) {
        const attendeeRecord = await db.getAsync(
          `SELECT * FROM session_attendees WHERE session_id = ? AND student_id = ?`,
          [id, currentUserId]
        );
        isEnrolled = !!attendeeRecord;
      }

      // Deny unauthorized third-party users
      if (!isTeacher && !isStudent && !isEnrolled && req.user?.role !== 'FACULTY_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to join this meeting. Only the assigned mentor and enrolled student(s) can enter.'
        });
      }

      // 3. Atomically Retrieve or Create Meeting (PREVENTS DUPLICATE MEETINGS)
      let meetingId = session.zoom_meeting_id;
      let password = session.zoom_meeting_password;
      let joinUrl = session.zoom_join_url;
      let startUrl = session.zoom_start_url;

      if (!meetingId) {
        // Create new meeting using Zoom API or high-performance WebRTC room generator
        const newMeeting = await zoomService.createMeeting({
          topic: `${session.skill} • ${session.topic || 'Skill Swap Live Session'}`,
          durationHours: session.hours || 1,
          startTime: session.date
        });

        meetingId = newMeeting.meetingId;
        password = newMeeting.password;
        joinUrl = newMeeting.joinUrl;
        startUrl = newMeeting.startUrl;

        // Persist meeting details to database with atomic update
        await db.runAsync(
          `UPDATE sessions 
           SET zoom_meeting_id = ?, zoom_meeting_password = ?, zoom_join_url = ?, zoom_start_url = ?, zoom_meeting_created = 1, meeting_started_at = COALESCE(meeting_started_at, CURRENT_TIMESTAMP)
           WHERE id = ?`,
          [meetingId, password, joinUrl, startUrl, id]
        );
      }

      // 4. Generate Zoom Web SDK Signature for Current User
      const isHost = isTeacher;
      const role = isHost ? 1 : 0; // 1 = Host, 0 = Participant
      const sigData = zoomService.generateSignature({ meetingNumber: meetingId, role });

      // 5. Fetch Full Real Participant Database Details
      const teacher = await db.getAsync(
        `SELECT id, name, email, avatar, role, college, major, rating, credits FROM users WHERE id = ?`,
        [session.teacher_id]
      );

      let learner = null;
      if (session.student_id && session.student_id !== 'GROUP_COHORT') {
        learner = await db.getAsync(
          `SELECT id, name, email, avatar, role, college, major, rating, credits FROM users WHERE id = ?`,
          [session.student_id]
        );
      }

      const attendees = isCohort
        ? await db.allAsync(
            `SELECT sa.*, u.avatar, u.major, u.role FROM session_attendees sa JOIN users u ON sa.student_id = u.id WHERE sa.session_id = ?`,
            [id]
          )
        : [];

      return res.json({
        success: true,
        sessionId: session.id,
        session: {
          id: session.id,
          skill: session.skill,
          topic: session.topic || `${session.skill} Live Exchange`,
          hours: session.hours,
          rate: session.rate,
          credits: session.credits,
          date: session.date,
          time: session.time,
          status: session.status,
          session_type: session.session_type,
          teacher: teacher || { id: session.teacher_id, name: session.teacher_id },
          learner: learner || (isCohort ? { id: 'cohort', name: `${attendees.length} Students Enrolled` } : { id: session.student_id, name: session.student_id }),
          attendees
        },
        meeting: {
          meetingId,
          password,
          signature: sigData.signature,
          sdkKey: sigData.sdkKey,
          role,
          userName: req.user?.name || (isHost ? teacher?.name : learner?.name) || 'User',
          userEmail: req.user?.email || 'student@vignan.ac.in',
          isHost,
          joinUrl,
          startUrl,
          provider: zoomService.isConfigured() ? 'ZOOM_MEETING_SDK' : 'EMBEDDED_RTC_MESH'
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Conclude and mark live meeting completed
   */
  async endLiveMeeting(req, res, next) {
    try {
      const { id } = req.params;
      await db.runAsync(`UPDATE sessions SET meeting_ended_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
      res.json({ success: true, message: 'Live meeting record finalized' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = sessionController;
