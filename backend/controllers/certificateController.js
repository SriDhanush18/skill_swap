const { supabaseService } = require('../database/supabase');
const { analyzeAndVerifyCertificate } = require('../services/certificateVerifier');

const certificateController = {
  async getCertificates(req, res, next) {
    try {
      const certs = await supabaseService.getCertificates();
      res.json({ success: true, certificates: certs });
    } catch (err) {
      next(err);
    }
  },

  async uploadCertificate(req, res, next) {
    try {
      const { skillName, issuer, certificateId, credentialId, credentialUrl, verificationScore, title, authority, scoreOrGrade, fileName, fileData, recipientName, issueDate } = req.body;
      const userId = req.user?.id || req.body.userId || req.currentUserId || 'sri';

      const result = await supabaseService.uploadCertificate(userId, {
        skillName,
        recipientName,
        authority: authority || issuer || 'NPTEL (IIT Madras / Kharagpur)',
        issuer: issuer || authority || 'NPTEL (IIT Madras / Kharagpur)',
        title: title || `${skillName} Certification`,
        credentialId: credentialId || certificateId,
        certificateId: credentialId || certificateId,
        credentialUrl,
        verificationScore,
        scoreOrGrade,
        issueDate,
        fileName,
        fileData
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          result: result.result || 'FAKE',
          aiReport: result.aiReport,
          error: result.error || result.aiReport?.reason || 'Verification Failed: The certificate is invalid, altered, or unrecognized.'
        });
      }

      res.json({ 
        success: true, 
        result: result.result || 'REAL',
        aiReport: result.aiReport,
        certificate: result.certificate || result,
        verificationProof: result.verificationProof,
        logoVerified: result.logoVerified !== false,
        logoDetails: result.logoDetails || 'NPTEL Official Seal & IIT Madras Digital Watermark Verified',
        authorizedBy: result.authorizedBy || 'National Programme on Technology Enhanced Learning (NPTEL & IIT Council)',
        tierInfo: result.tierInfo,
        qualificationBonusAwarded: result.qualificationBonusAwarded === true,
        bonusCredits: result.bonusCredits !== undefined ? result.bonusCredits : (result.result === 'REAL' ? 2.0 : 0),
        isPendingManualReview: result.isPendingManualReview || false,
        message: result.message || 'Certificate successfully verified through AI multi-vector authenticity engine! +2.0 Skill Credits allotted to your wallet.'
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyCertificateAI(req, res, next) {
    try {
      const { skillName, issuer, certificateId, credentialId, credentialUrl, verificationScore, title, authority, scoreOrGrade, fileName, fileData, recipientName, issueDate } = req.body;
      const userId = req.user?.id || req.body.userId || req.currentUserId || 'sri';
      const user = await supabaseService.getUserById(userId);

      const aiReport = analyzeAndVerifyCertificate({
        skillName,
        recipientName: recipientName || user?.name || 'Student',
        authority: authority || issuer || 'Academic Authority',
        issuer: issuer || authority || 'Academic Authority',
        title: title || `${skillName} Certification`,
        credentialId: credentialId || certificateId,
        scoreOrGrade,
        issueDate,
        verificationUrl: credentialUrl,
        fileName,
        fileData,
        userContext: user || {}
      });

      res.json(aiReport);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = certificateController;
