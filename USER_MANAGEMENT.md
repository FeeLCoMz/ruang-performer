# Ruang Performer - User Management Best Practices

## 👥 User Management System

### User Types & Their Needs

#### 1. **Solo Musician** 🎸
- Single user per band
- Full control over all content
- No member management needed
- Simple workflow

**Setup:**
```
User creates account → Creates band → Becomes band owner
```

---

#### 2. **Band with Members** 🎼
- One owner/manager
- Multiple musicians
- Shared songs & setlists
- Collaborative planning

**Setup:**
```
Owner creates account
→ Creates band
→ Invites members
→ Members join band
→ Everyone sees songs/setlists
```

---

#### 3. **Multiple Bands** 🎵
- One user in different bands
- Different roles per band
- Personal profile
- Cross-band analytics

**Setup:**
```
User creates account
→ Joins/Creates multiple bands
→ Has different roles per band
→ Personal dashboard shows all bands
```

---

## 🔐 Authentication Flow

### Registration Process

```
User fills form
    ↓
Validate email format
    ↓
Check email not already used
    ↓
Hash password (bcryptjs)
    ↓
Create user record
    ↓
Send verification email (optional)
    ↓
Success - User can login
```

### Login Process

```
User enters email & password
    ↓
Find user by email
    ↓
Compare password (bcryptjs)
    ↓
If valid:
  - Generate JWT token
  - Set token in localStorage
  - Redirect to dashboard
    ↓
If invalid:
  - Show error message
```

### Session Management

```javascript
// Store JWT in localStorage
localStorage.setItem('ruangperformer_token', jwtToken);

// Send token with every API request
const headers = {
  'Authorization': `Bearer ${token}`
};

// Clear token on logout
localStorage.removeItem('ruangperformer_token');
```

---

## 👤 User Profile Structure

```javascript
{
  id: 1,
  email: "musician@example.com",
  displayName: "John Doe",
  profilePicture: "/avatars/john.jpg",
  bio: "Guitarist & vocalist",
  instrument: "guitar",
  experience: "10 years",
  genres: ["rock", "blues"],
  location: "Jakarta, Indonesia",
  
  // Bands this user is member of
  bands: [
    {
      bandId: 1,
      bandName: "The Rockers",
      role: "owner", // owner, admin, member
      joinedAt: "2024-01-01"
    },
    {
      bandId: 2,
      bandName: "Blues Band",
      role: "member",
      joinedAt: "2024-06-15"
    }
  ],
  
  // User settings
  preferences: {
    theme: "dark",
    notifications: true,
    privateProfile: false
  },
  
  // Account info
  createdAt: "2024-01-01",
  updatedAt: "2024-02-02",
  lastLoginAt: "2026-02-02"
}
```

---

## 🎯 User Workflows

### Workflow 1: First Time Setup (Solo Musician)

```
1. Sign Up
   - Email, password, display name
   - Verify email (optional)

2. Create Band
   - Band name, genre, description
   - User becomes band owner

3. Add Songs
   - Upload first song
   - Add chords & lyrics

4. Done! 
   - User can now manage songs, setlists, etc.
```

### Workflow 2: Band Manager Inviting Members

```
1. Band Owner creates account & band

2. Invite Members
   - Enter member email
   - Send invitation link

3. Member Signs Up (via link)
   - Auto-join the band
   - Becomes member role

4. Permissions Active
   - Member can view songs/setlists
   - Can participate in events
   - Cannot edit/delete content
```

### Workflow 3: Promoting Member to Admin

```
1. Band owner goes to Members section

2. Click "Make Admin" on member

3. System:
   - Updates member role to 'admin'
   - Sends notification to member
   - Logs action in audit trail

4. Admin now can:
   - Create/edit/delete songs
   - Schedule events
   - Manage setlists
```

---

## 📧 Email Communication

### Invitation Email Template

```
Subject: [Member Name] invited you to [Band Name] on Ruang Performer

Hi [Recipient Name],

[Inviter Name] invited you to join [Band Name] on Ruang Performer!

Band: [Band Name]
Genre: [Genre]
Role: Member

To accept the invitation:
[Click Here] → https://ruangperformer.app/join?code=XXXX

Or copy this code: XXXX

Questions? Reply to this email.

Best regards,
Ruang Performer Team
```

### Role Change Notification

```
Subject: Your role in [Band Name] has been updated

Hi [Member Name],

Your role in [Band Name] has been changed from Member to Admin.

As an admin, you can now:
✅ Create and edit songs
✅ Create and edit setlists
✅ Schedule practice sessions
✅ Schedule gigs

You still cannot manage members - only the band owner can do that.

Best regards,
Ruang Performer Team
```

### New Member Welcome

```
Subject: Welcome to [Band Name]!

Hi [New Member Name],

Welcome to [Band Name] on Ruang Performer! 🎵

Here's what you can do:
📝 View all band songs
📋 Check setlists
📅 See practice schedules
🎤 View upcoming gigs
💬 Add notes and comments

Get started: [Dashboard Link]

Best regards,
Ruang Performer Team
```

---

## 🚨 User Safety & Security

### Password Requirements
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter
- ✅ At least one number
- ✅ At least one special character (!@#$%^&*)
- ✅ Not same as email/username

### Account Security

```javascript
// Password hashing
import bcrypt from 'bcryptjs';

// Hash password on registration
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// Verify password on login
const isValid = await bcrypt.compare(plainPassword, hashedPassword);

// Store hashedPassword in database (NEVER plain text)
```

### Session Security

```javascript
// JWT Token settings
const token = jwt.sign(
  { userId, email, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' } // Token expires in 7 days
);

// Verify token on each request
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (err) {
  // Token expired or invalid
}
```

---

## 🔔 Notifications

### When to Notify User

| Event | Notification Type | Content |
|-------|-------------------|---------|
| **Invited to band** | Email | "X invited you to Y band" |
| **Role changed** | Email + In-app | "Your role changed to Admin" |
| **New member joined** | In-app | "X joined the band" |
| **Member removed** | Email | "You were removed from band" |
| **Practice scheduled** | Email + In-app | "Practice session scheduled" |
| **Gig scheduled** | Email + In-app | "New gig scheduled" |
| **Password changed** | Email | "Your password was changed" |
| **Login from new device** | Email | "New login: [Device], [Location], [Time]" |

---

## 📊 User Activity Dashboard

### Owner/Admin View

```
Dashboard shows:
├── Band Overview
│   ├── Total members
│   ├── Active songs count
│   ├── Upcoming gigs
│   └── Upcomingractice sessions
│
├── Member Activity
│   ├── New members this month
│   ├── Active participants
│   ├── Attendance rates
│   └── Most active members
│
├── Content Analytics
│   ├── Most played songs
│   ├── Song popularity
│   ├── Recent uploads
│   └── Deleted content log
│
└── Event Analytics
    ├── Gig attendance
    ├── Practice attendance
    ├── Cancelled events
    └── Event scheduling
```

### Member View

```
Dashboard shows:
├── My Band
│   ├── Band name & members
│   ├── Recent songs
│   ├── Active setlists
│   └── Upcoming events
│
├── My Activity
│   ├── Saved songs
│   ├── Favorite setlists
│   ├── Event RSVPs
│   └── My notes
│
└── Upcoming
    ├── Practice sessions
    ├── Gigs
    └── Calendar view
```

---

## 🎓 User Onboarding

### Step 1: Welcome Email
```
After signup, send:
- Welcome message
- Platform tour link
- Getting started guide
- Contact support info
```

### Step 2: First Login
```
Show tutorial:
- Add first song
- Create setlist
- Invite members (if band owner)
- Check profile settings
```

### Step 3: In-App Tips
```
Show contextual help:
- Hover tooltips
- Feature highlights
- Usage suggestions
- Best practices
```

---

## 🏥 Data Privacy

### GDPR Compliance

- ✅ User can download all data
- ✅ User can delete account
- ✅ User can control data sharing
- ✅ Clear privacy policy
- ✅ Cookie consent

### User Data Export

```javascript
// User can export their data
GET /api/users/me/export

Response:
{
  user: { ...userData },
  bands: [ ...allBands ],
  songs: [ ...allSongs ],
  setlists: [ ...allSetlists ],
  events: [ ...allEvents ],
  auditLog: [ ...actions ]
}
```

### Account Deletion

```javascript
// User can request account deletion
POST /api/users/me/delete-request

// 30-day grace period
// Then:
  - Delete all user data
  - Delete from all bands
  - Archive audit logs
  - Anonymize comments/notes
```

---

## 🔒 Authorization Rules

### Can Access Resource If:

1. **Is the owner**
   ```javascript
   resource.ownerId === currentUser.id
   ```

2. **Is band admin/owner**
   ```javascript
   user.role === 'admin' || user.role === 'owner'
   ```

3. **Is band member**
   ```javascript
   user.bandId === resource.bandId
   ```

4. **Is super admin**
   ```javascript
   user.isSuperAdmin === true
   ```

### Cannot Access If:

- ❌ Not member of the band
- ❌ Band has been deleted
- ❌ User account suspended
- ❌ Token expired
- ❌ Insufficient permissions

---

## 📋 Implementation Checklist

### Phase 1: Core Auth
- [ ] User registration endpoint
- [ ] Login endpoint
- [ ] Password hashing (bcryptjs)
- [ ] JWT token generation
- [ ] Token refresh mechanism
- [ ] Logout functionality
- [ ] Password reset flow

### Phase 2: Band Management
- [ ] Create band endpoint
- [ ] Invite members endpoint
- [ ] Accept invitation endpoint
- [ ] Update member role endpoint
- [ ] Remove member endpoint
- [ ] Leave band endpoint

### Phase 3: User Profile
- [ ] Edit profile endpoint
- [ ] Upload avatar endpoint
- [ ] Update preferences endpoint
- [ ] View public profile endpoint
- [ ] Privacy settings endpoint

### Phase 4: Security
- [ ] Rate limiting
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CORS configuration
- [ ] HTTPS enforcement

### Phase 5: Features
- [ ] Email notifications
- [ ] Session management
- [ ] Activity logging
- [ ] User suspension/ban
- [ ] Data export

---

## 🎯 Success Metrics

Track these to measure user system health:

```
📊 User Metrics:
  - Total registered users
  - Active users (last 30 days)
  - New signups per week
  - User retention rate
  - Average session duration

🎵 Band Metrics:
  - Bands created
  - Average members per band
  - Bands with active events
  - Bands using all features

🔐 Security Metrics:
  - Failed login attempts
  - Password resets per day
  - Suspended accounts
  - Audit log entries
  - Permission denials

📧 Communication:
  - Email delivery rate
  - Email open rate
  - Invitation acceptance rate
  - Support ticket volume
```

---

**Last Updated:** February 2, 2026  
**Status:** Best Practices Guide Ready  
**Next Steps:** Implement user management system
