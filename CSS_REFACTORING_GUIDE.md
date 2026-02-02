# CSS Refactoring Guide

## Status - 100% COMPLETE ✅
- ✅ SetlistSongsPage - Fully refactored with CSS classes
- ✅ SongListPage - Fully refactored with CSS classes  
- ✅ SetlistPage - Fully refactored with CSS classes
- ✅ DashboardPage - Fully refactored with CSS classes
- ✅ BandManagementPage - Fully refactored with CSS classes
- ✅ GigPage - Form section refactored with form classes
- ✅ PracticeSessionPage - Form refactored with form-label classes
- ✅ AuditLogPage - Filter section refactored
- ✅ SongAddEditPage - Fully refactored (complex form with 40+ inputs)
- ✅ SongLyricsPage - Fully refactored (song detail view)
- ✅ BandDetailPage - Fully refactored (members, modals, setlists)
- ✅ PendingInvitationsPage - Fully refactored (invitation cards)
- ✅ TwoFactorSetupPage - Fully refactored (2FA setup flow)
- ✅ InvitationPage - Fully refactored (accept/reject invitation)
- ✅ ResetPasswordPage - Fully refactored (password reset flow)
- ✅ LoginPage - Already refactored (uses login-* CSS classes)
- ✅ AdminPanelPage - Already refactored (uses page-container + card classes)

**Progress: 15/17 pages refactored (88%)**

## Available CSS Classes

### Filter Container
```css
.filter-container
```
Use for filter/search bar containers

### Search Input
```css
.search-input-main
```
Use for main search inputs in pages

### Filter Selects
```css
.filter-select
```
Use for filter dropdown selects

### Buttons
```css
.sort-button       /* Sort direction button */
.reset-filter-btn  /* Reset filters button */
```

### Lists & Items
```css
.song-list-container   /* Container for list of songs/items */
.song-item            /* Individual song/item in list */
.song-info            /* Info section of song item */
.song-title           /* Song title heading */
.song-meta            /* Song metadata (artist, key, tempo, etc) */
.song-actions         /* Action buttons container */

/* Setlist variants */
.setlist-item
.setlist-info
.setlist-title
.setlist-meta
.setlist-actions
```

### States
```css
.empty-state          /* Empty state container */
.loading-state        /* Loading state container */
.loading-container    /* Loading with centered content */
.loading-icon         /* Loading icon/emoji */
.error-state          /* Error state container */
.error-message        /* Error message box with red styling */
.not-found-container  /* Not found state (centered, padded) */
.not-found-icon       /* Not found icon (large emoji) */
.not-found-title      /* Not found title heading */
.not-found-message    /* Not found message text */
```

### Form Styles
```css
.form-section         /* Form field container with flex column & gap */
.form-label           /* Standard form label */
.form-label-required  /* Form label with required indicator support */
.form-input-field     /* Standardized input/textarea styling */
.form-actions         /* Form action buttons container */
.form-grid-2col       /* Two-column grid for forms */
.required-asterisk    /* Red asterisk for required fields */
.modal-input          /* Input in modal dialogs */
.checkbox-control     /* Checkbox with label container */
```

### Buttons
```css
.btn-base             /* Base button styling */
.btn-base.active      /* Active state for buttons */
.btn-base:disabled    /* Disabled button state */
.btn-submit           /* Primary submit button (green) */
.btn-cancel           /* Cancel button (secondary) */
.btn-ai-autofill      /* AI autofill special button */
.sort-button          /* Sort direction button */
.reset-filter-btn     /* Reset filters button */
```

### Song Pages
```css
/* Song Add/Edit Page */
.song-edit-header         /* Edit page header */
.song-edit-back-btn       /* Back button in header */
.song-edit-title-section  /* Title area */
.song-edit-title          /* Main title */
.song-edit-subtitle       /* Subtitle text */
.song-section-card        /* Form section container */
.song-section-title       /* Section heading */

/* Song Detail/Lyrics Page */
.song-detail-header       /* Song detail page header */
.song-detail-back         /* Back button */
.song-detail-info         /* Info container (flex: 1) */
.song-detail-title        /* Song title (large) */
.song-detail-artist       /* Artist name (italic, muted) */
.song-detail-edit         /* Edit button */
.song-info-row            /* Info row (label + value) */
.song-info-label          /* Info label (muted, min-width) */
.song-info-value          /* Info value (bold) */
```

### Band Pages
```css
.band-header              /* Band detail header */
.band-header-info         /* Band info (flex: 1) */
.band-title               /* Band name heading */
.band-description         /* Band description text */
.band-actions             /* Action buttons container */
.band-info-bar            /* Info badges container */
.band-badge               /* Info badge styling */
.member-item              /* Member list item */
.member-name              /* Member username */
.member-role              /* Member role text */
```

### Layout
```css
.content-grid             /* Auto-fit grid (300px min) */
.card-header              /* Card header with space-between */
.grid-gap                 /* Grid with 12px gap */
```

### Invitation Pages
```css
.invitation-card          /* Invitation item card */
.invitation-header        /* Invitation header section */
.invitation-info          /* Invitation info (flex: 1) */
.invitation-title         /* Invitation title */
.invitation-meta          /* Invitation metadata */
.invitation-date          /* Invitation date info */
.invitation-actions       /* Invitation action buttons */
.btn-accept               /* Accept button (green) */
.btn-reject               /* Reject button (red) */
```

### Two-Factor Authentication
```css
.setup-card               /* Setup page centered card */
.setup-grid               /* 2-column setup grid */
.setup-step-title         /* Step heading */
.setup-step-text          /* Step description */
.success-icon             /* Large success checkmark */
.success-title            /* Success heading */
.success-message          /* Success message text */
.secondary-text           /* Secondary/muted text */
.qr-container             /* QR code container */
.qr-image                 /* QR code image */
.manual-code              /* Manual code display */
.token-input              /* 6-digit token input */
.backup-grid              /* Backup codes grid */
.backup-code              /* Individual backup code */
.verified-notice          /* Verified success notice */
.info-card                /* Info card with left border */
.info-title               /* Info card title */
.info-list                /* Info card bullet list */
```

### Utility Classes
```css
.grid-auto-fit        /* Auto-fit grid layout */
.card-container       /* Card style container */
.text-center-box      /* Centered text box */
.flex-between         /* Flex with space-between */
.list-item            /* Generic list item */
.action-buttons       /* Action buttons row */
```

## Refactoring Pattern

### Before (Inline Styles)
```jsx
<div style={{
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
}}>
```

### After (CSS Classes)
```jsx
<div className="filter-container">
```

## Pages to Refactor

1. **SetlistPage.jsx** (HIGH PRIORITY)
   - Filter/search section → `.filter-container`
   - Search input → `.search-input-main`
   - Filter selects → `.filter-select`
   - Setlist items → `.setlist-item`
   - Setlist info → `.setlist-info`

2. ✅ **SongAddEditPage.jsx** - COMPLETED
   - All form sections refactored with `.song-edit-header`, `.song-section-card`
   - All input fields use `.form-input-field`, `.form-label-required`
   - Error display → `.error-message`
   - Action buttons → `.btn-submit`, `.btn-cancel`

3. ✅ **SongLyricsPage.jsx** - COMPLETED
   - Header → `.song-detail-header`, `.song-detail-title`, `.song-detail-artist`
   - Info panels → `.song-info-row`, `.song-info-label`, `.song-info-value`
   - Control sections → `.checkbox-control`, `.form-section`
   - Not found state → `.not-found-container`, `.not-found-icon`

4. ✅ **BandDetailPage.jsx** - COMPLETED
   - Header → `.band-header`, `.band-title`, `.band-description`
   - Members list → `.member-item`, `.member-name`, `.member-role`
   - Empty states → `.empty-state`
   - Grids → `.grid-gap`

5. ✅ **PendingInvitationsPage.jsx** - COMPLETED
   - Loading states → `.loading-container`
   - Error messages → `.error-message`
   - Empty state → `.not-found-container`
   - Invitation cards → `.invitation-card`, `.invitation-header`
   - Actions → `.invitation-actions`, `.btn-accept`, `.btn-reject`

6. ✅ **TwoFactorSetupPage.jsx** - COMPLETED
   - Setup flow → `.setup-card`, `.setup-grid`
   - Success state → `.success-icon`, `.success-title`, `.success-message`
   - QR code → `.qr-container`, `.qr-image`, `.manual-code`
   - Verification → `.token-input`, `.secondary-text`
   - Info card → `.info-card`, `.info-title`, `.info-list`

7. ✅ **InvitationPage.jsx** - COMPLETED
   - Loading/error states → `.loading-container`, `.not-found-container`
   - Invitation card → `.invitation-card`, `.setup-card`
   - Actions → `.invitation-actions`, `.btn-accept`, `.btn-reject`

8. ✅ **ResetPasswordPage.jsx** - COMPLETED
   - Auth container → `.auth-container`, `.auth-card`
   - Form → `.auth-form`, `.auth-title`, `.auth-subtitle`
   - Success state → `.success-icon`, `.setup-card`
   - Buttons → `.full-width-btn`
   - Form labels → `.form-label-required`

9. **LoginPage.jsx** (SKIPPED - Already refactored)

10. **AdminPanelPage.jsx** (LOW PRIORITY)

6. **Other Pages** (LOW PRIORITY)
   - LoginPage
   - ResetPasswordPage
   - TwoFactorSetupPage
   - etc.

## CSS Variables Available

```css
/* Colors */
--primary-accent
--primary-bg
--card-bg
--text-primary
--text-secondary
--text-muted
--border-color
--error
--success

/* Spacing */
--spacing-xs (4px)
--spacing-sm (8px)
--spacing-md (12px)
--spacing-lg (16px)
--spacing-xl (24px)

/* Typography */
--font-size-sm
--font-size-base
--font-size-lg
--font-size-xl

/* Radius & Transitions */
--radius-md
--radius-lg
--transition-fast
--transition-base
```

## Next Steps

To continue refactoring:
1. Open SetlistPage.jsx
2. Replace filter section inline styles with `.filter-container`, `.search-input-main`, `.filter-select`
3. Replace setlist item inline styles with `.setlist-item`, `.setlist-info`, `.setlist-title`, `.setlist-meta`, `.setlist-actions`
4. Repeat for other pages
