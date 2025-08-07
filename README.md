# Afterz - Modern Timesheet Management

A modern React-based timesheet application built for Frappe Framework, designed for efficient project time tracking with drag-and-drop functionality.

## Features

- **Modern Calendar Interface**: Weekly view with 6AM-6PM or full-day modes
- **Drag & Drop**: Drag activities from palette onto calendar slots to create timesheet entries
- **Real-time Updates**: Live synchronization with Frappe backend
- **User Management**: Admin users can view and manage other users' timesheets
- **Project Integration**: Seamlessly integrates with existing Project and Activity doctypes
- **Responsive Design**: Works on desktop and mobile devices
- **Status Management**: Draft, Submitted, Approved workflow support

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern styling
- **@dnd-kit** for drag and drop functionality
- **date-fns** for date manipulation
- **frappe-react-sdk** for Frappe integration

### Backend Integration
- Custom API endpoints in `afterz/api.py`
- Website routes for React app serving
- Integration with existing ERPLite doctypes:
  - Project
  - Activity  
  - Timesheet Entry

## Project Structure

```
afterz/
├── afterz/
│   ├── api.py                    # Custom API endpoints
│   └── www/
│       ├── afterz.py            # Website route handler
│       └── afterz.html          # HTML template with Frappe integration
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Calendar/        # Calendar components
│   │   │   └── Controls/        # UI controls
│   │   ├── services/            # API integration
│   │   ├── types/               # TypeScript definitions
│   │   └── lib/                 # Utility functions
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── proxyOptions.js          # Vite proxy configuration
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Development Mode

Start the Vite development server:

```bash
cd frontend
npm run dev
```

The React app will be served on `http://localhost:8080` and proxy API calls to your Frappe site.

### 3. Access the Application

Navigate to: `https://crew.tierneymorris.com.au/afterz`

The HTML template will:
- Load Frappe boot data for authentication
- Serve the React app from Vite dev server (development mode)
- Handle CSRF tokens automatically

### 4. Production Build

To build for production:

```bash
cd frontend
npm run build
```

Built files will be output to `../public/frontend/` and served directly by Frappe.

## API Endpoints

The application uses custom API endpoints defined in `afterz/api.py`:

- `afterz.api.get_timesheet_entries` - Get timesheet entries for date range
- `afterz.api.create_timesheet_entry` - Create new timesheet entry
- `afterz.api.update_timesheet_entry` - Update existing entry
- `afterz.api.delete_timesheet_entry` - Delete entry
- `afterz.api.check_in` - Start a timesheet entry
- `afterz.api.check_out` - End a timesheet entry
- `afterz.api.get_active_entry` - Get current user's active entry
- `afterz.api.get_projects` - Get active projects
- `afterz.api.get_activities` - Get activities (optionally by project)
- `afterz.api.get_users` - Get users for management

## Usage

### Basic Workflow

1. **Select Week**: Use the week selector to navigate between weeks
2. **View Activities**: Browse available activities in the left panel
3. **Create Entries**: Drag activities onto calendar time slots
4. **Manage Entries**: Edit, delete, or check out entries using hover controls
5. **Submit for Approval**: Submit completed entries for manager approval

### User Roles

- **Projects User**: Can manage their own timesheet entries
- **Projects Manager**: Can view and manage all users' timesheets
- **System Manager**: Full access to all features

### Drag & Drop

- Drag activities from the palette onto calendar slots
- Activities are grouped by project for easy navigation
- Search and filter activities by project or name
- Visual feedback during drag operations

### Time Tracking

- **Check In**: Drag activity to time slot to start tracking
- **Active Indicator**: Green pulsing dot shows active entries
- **Check Out**: Click the square button to end tracking
- **Duration**: Automatically calculated based on check-in/out times

## Testing Strategy

### Phase 1: Basic Functionality
1. Access the app at `/afterz`
2. Verify Frappe boot data loads correctly
3. Test API connectivity with existing data
4. Confirm user authentication works

### Phase 2: Calendar Interface
1. Test week navigation (previous/next/current)
2. Verify calendar renders with correct time slots
3. Test view mode toggle (6AM-6PM vs full day)
4. Check responsive design on different screen sizes

### Phase 3: Drag & Drop
1. Test dragging activities onto calendar slots
2. Verify timesheet entries are created correctly
3. Test visual feedback during drag operations
4. Confirm entries appear in correct time slots

### Phase 4: Entry Management
1. Test editing entries (hover controls)
2. Test deleting entries with confirmation
3. Test check-in/check-out functionality
4. Verify status updates work correctly

### Phase 5: User Management
1. Test user selector for managers
2. Verify permission-based access
3. Test viewing other users' timesheets
4. Confirm read-only mode for non-owners

## Expected Blast Radius

**Minimal Impact**: The application is completely isolated:
- No changes to existing ERPLite doctypes
- Uses read-only access to Project and Activity data
- Only creates/modifies Timesheet Entry records
- Separate website route (`/afterz`)
- Independent frontend build process

**Testing Required**:
- Verify existing timesheet workflows still work
- Confirm no impact on Project/Activity functionality
- Test permissions work correctly
- Validate data integrity

## Troubleshooting

### Common Issues

1. **App won't load**: Check if Vite dev server is running on port 8080
2. **API errors**: Verify Frappe site is accessible and user is logged in
3. **CSRF errors**: Ensure boot data is loading correctly
4. **Drag & drop not working**: Check browser console for JavaScript errors

### Debug Information

The HTML template includes debug logging:
- Frappe boot data availability
- Current user information
- Loading mode (development vs production)

### Development Tools

- Browser DevTools for React debugging
- Network tab for API call inspection
- Console for error messages and debug logs

## Future Enhancements

- **Mobile App**: React Native version for mobile time tracking
- **Offline Support**: PWA capabilities for offline entry creation
- **Advanced Reporting**: Charts and analytics for time tracking data
- **Integrations**: Calendar sync, notification systems
- **Bulk Operations**: Copy weeks, apply templates, bulk approval

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify Frappe site connectivity
3. Confirm user permissions are correct
4. Review API endpoint responses in Network tab

---

**Built with ❤️ for modern timesheet management**
