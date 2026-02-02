import { getTursoClient } from '../_turso.js';

/**
 * GET /api/bands/:id/members - Get all members of a band
 * POST /api/bands/:id/members - Add a new member to band
 */
async function GET(req, { params }) {
  const { id: bandId } = params;
  const userId = req.user?.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = getTursoClient();

    // Verify user is member of band or owner
    const bandResult = await client.execute(
      'SELECT createdBy FROM bands WHERE id = ?',
      [bandId]
    );

    if (!bandResult.rows || bandResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Band not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isOwner = bandResult.rows[0].createdBy === userId;
    const memberCheck = await client.execute(
      'SELECT id FROM band_members WHERE bandId = ? AND userId = ?',
      [bandId, userId]
    );

    if (!isOwner && (!memberCheck.rows || memberCheck.rows.length === 0)) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all members with their info
    const members = await client.execute(
      `SELECT 
        bm.userId,
        bm.role,
        u.username,
        u.email,
        CASE WHEN b.createdBy = u.id THEN 1 ELSE 0 END as isOwner
      FROM band_members bm
      JOIN users u ON bm.userId = u.id
      JOIN bands b ON bm.bandId = b.id
      WHERE bm.bandId = ?
      ORDER BY CASE WHEN b.createdBy = u.id THEN 0 ELSE 1 END, u.username`,
      [bandId]
    );

    // Include the owner in the list
    const memberIds = members.rows?.map(m => m.userId) || [];
    const ownerResult = await client.execute(
      `SELECT id, username, email FROM users WHERE id = ?`,
      [bandResult.rows[0].createdBy]
    );

    const allMembers = [];

    // Add owner first
    if (ownerResult.rows && ownerResult.rows.length > 0) {
      allMembers.push({
        userId: ownerResult.rows[0].id,
        username: ownerResult.rows[0].username,
        email: ownerResult.rows[0].email,
        role: 'owner',
        isOwner: true
      });
    }

    // Add other members
    if (members.rows) {
      members.rows.forEach(m => {
        allMembers.push({
          userId: m.userId,
          username: m.username,
          email: m.email,
          role: m.role,
          isOwner: m.isOwner === 1
        });
      });
    }

    return new Response(JSON.stringify(allMembers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch members' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PATCH /api/bands/:id/members/:userId - Update member role
 * DELETE /api/bands/:id/members/:userId - Remove member
 */
async function PATCH(req, { params }) {
  const { id: bandId, userId } = params;
  const requesterId = req.user?.userId;

  if (!requesterId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { role } = await req.json();

    if (!['member', 'admin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = getTursoClient();

    // Verify requester is band owner
    const bandResult = await client.execute(
      'SELECT createdBy FROM bands WHERE id = ?',
      [bandId]
    );

    if (!bandResult.rows || bandResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Band not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (bandResult.rows[0].createdBy !== requesterId) {
      return new Response(JSON.stringify({ error: 'Only owner can change roles' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cannot change owner role
    if (bandResult.rows[0].createdBy === userId) {
      return new Response(JSON.stringify({ error: 'Cannot change owner role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update role
    await client.execute(
      'UPDATE band_members SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE bandId = ? AND userId = ?',
      [role, bandId, userId]
    );

    // Get updated member info
    const member = await client.execute(
      `SELECT bm.userId, bm.role, u.username, u.email
       FROM band_members bm
       JOIN users u ON bm.userId = u.id
       WHERE bm.bandId = ? AND bm.userId = ?`,
      [bandId, userId]
    );

    if (!member.rows || member.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({
        userId: member.rows[0].userId,
        role: member.rows[0].role,
        username: member.rows[0].username,
        email: member.rows[0].email
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating member role:', error);
    return new Response(JSON.stringify({ error: 'Failed to update member role' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function DELETE(req, { params }) {
  const { id: bandId, userId } = params;
  const requesterId = req.user?.userId;

  if (!requesterId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = getTursoClient();

    // Verify requester is band owner
    const bandResult = await client.execute(
      'SELECT createdBy FROM bands WHERE id = ?',
      [bandId]
    );

    if (!bandResult.rows || bandResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Band not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (bandResult.rows[0].createdBy !== requesterId) {
      return new Response(JSON.stringify({ error: 'Only owner can remove members' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cannot remove owner
    if (bandResult.rows[0].createdBy === userId) {
      return new Response(JSON.stringify({ error: 'Cannot remove owner' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove member
    await client.execute(
      'DELETE FROM band_members WHERE bandId = ? AND userId = ?',
      [bandId, userId]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return new Response(JSON.stringify({ error: 'Failed to remove member' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Default export handler for Express
export default async function bandMembersHandler(req, res) {
  try {
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Band members handler error:', error);
    res.status(500).json({ error: error.message });
  }
}
