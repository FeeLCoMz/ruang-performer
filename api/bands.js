/**
 * Consolidated bands handler  
 * Handles: GET/POST /api/bands, GET/PUT/DELETE /api/bands/:id, /api/bands/:id/members, etc.
 */

import bandsIndexHandler from './bands/index.js';
import bandsIdHandler from './bands/[id].js';
import bandMembersHandler from './bands/members.js';
import bandInvitationsHandler from './bands/invitations.js';
import bandInvIdHandler from './bands/invitations/[id].js';

export default async function consolidatedBandsHandler(req, res) {
  const pathParts = req.url.split('/').filter(Boolean);
  // api/bands/:id/members/:userId -> ['api', 'bands', 'id', 'members', 'userId']
  // api/bands/:id/members -> ['api', 'bands', 'id', 'members']
  // api/bands/invitations/:id -> ['api', 'bands', 'invitations', 'id']
  // api/bands/:id -> ['api', 'bands', 'id']
  // api/bands -> ['api', 'bands']

  const bandId = pathParts[2];
  const thirdSegment = pathParts[3];

  // Handle invitations
  if (pathParts[1] === 'bands' && pathParts[2] === 'invitations') {
    if (pathParts[3]) {
      // /api/bands/invitations/:id
      return bandInvIdHandler(req, res);
    } else {
      // /api/bands/invitations
      return bandInvitationsHandler(req, res);
    }
  }

  // Handle nested paths like /api/bands/:id/members
  if (thirdSegment === 'members') {
    return bandMembersHandler(req, res);
  }

  // Handle /api/bands/:id
  if (bandId && thirdSegment !== 'members' && thirdSegment !== 'invitations') {
    return bandsIdHandler(req, res);
  }

  // Handle /api/bands
  return bandsIndexHandler(req, res);
}
