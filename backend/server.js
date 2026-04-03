/**
 * DRDIS — Express Server
 * Main entry point for the Disaster Response Decision Intelligence System.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { processRequests } = require('./processRequests');
const { scoreRequest, selectTopRequest, generateReasons } = require('./reasoner');
const { matchVolunteer } = require('./matcher');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const DEFAULT_VOLUNTEERS = [
  { id: 'v1', name: 'Emergency Response Team', skills: ['medical', 'rescue', 'first-aid'] },
  { id: 'v2', name: 'Logistics Support Unit', skills: ['transport', 'supply', 'logistics'] },
  { id: 'v3', name: 'Crisis Communication Team', skills: ['communication', 'coordination', 'public-relations'] },
];

app.post('/api/analyze', (req, res) => {
  try {
    const { requests, volunteers } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['Invalid input: requests must be a non-empty array.'],
        decision_score: 0,
        all_requests: [],
      });
    }

    const processResult = processRequests(requests);

    if (processResult.error) {
      return res.status(400).json({
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['Input validation failed.', ...(processResult.details || [])],
        decision_score: 0,
        all_requests: [],
      });
    }

    const parsedRequests = processResult.processed.map((item) => item.parsed);

    const { selected_request, decision_score, all_requests } = selectTopRequest(parsedRequests);

    if (!selected_request) {
      return res.status(200).json({
        selected_request: null,
        assigned_volunteer: null,
        reasons: ['No valid requests to process.'],
        decision_score: 0,
        all_requests: [],
      });
    }

    const safeVolunteers = Array.isArray(volunteers) && volunteers.length > 0
      ? volunteers
      : DEFAULT_VOLUNTEERS;

    const volunteerMatch = matchVolunteer(selected_request, safeVolunteers);

    const { reasons } = generateReasons(selected_request, decision_score, volunteerMatch.volunteer);

    return res.status(200).json({
      selected_request,
      assigned_volunteer: {
        ...volunteerMatch.volunteer,
        match_score: volunteerMatch.match_score,
        matched_skills: volunteerMatch.matched_skills,
        is_fallback: volunteerMatch.is_fallback,
      },
      reasons,
      decision_score,
      all_requests,
    });

  } catch (error) {
    console.error('Error in /api/analyze:', error.message);
    return res.status(500).json({
      selected_request: null,
      assigned_volunteer: null,
      reasons: ['Internal server error. Default emergency response recommended.'],
      decision_score: 0,
      all_requests: [],
    });
  }
});

app.get('/health', (req, res) => {
  try {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

app.use((req, res) => {
  res.status(404).json({
    selected_request: null,
    assigned_volunteer: null,
    reasons: ['Route not found.'],
    decision_score: 0,
    all_requests: [],
  });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  res.status(500).json({
    selected_request: null,
    assigned_volunteer: null,
    reasons: ['Unexpected server error.'],
    decision_score: 0,
    all_requests: [],
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`DRDIS Backend running on port ${PORT}`);
});

module.exports = app;