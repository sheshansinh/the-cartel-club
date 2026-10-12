# Phase 7: Advanced Admin Panel

## Overview
A comprehensive admin panel for managing the Cue Club business operations. Built with shadcn/ui components for a modern, fast, and professional interface.

## Features Implemented

### 1. Dashboard (`/admin`)
- **Key Metrics**: Total bookings, today's bookings, total revenue, active tables
- **Booking Status**: Pending, confirmed, cancelled counts
- **Recent Bookings**: Quick view of latest 5 bookings
- **Real-time Stats**: All statistics update in real-time

### 2. Bookings Management (`/admin/bookings`)
- **Full Booking List**: View all bookings with pagination
- **Search**: Search by customer name, phone, or table number
- **Filter**: Filter by booking status (Pending, Confirmed, Cancelled, Completed)
- **Pagination**: 10 items per page with navigation
- **Quick Actions**:
  - View booking details in modal
  - Confirm pending bookings
  - Cancel bookings
  - View customer contact info
- **Status Badges**: Color-coded status indicators
- **Payment Status**: Shows payment status for each booking

### 3. Tables Management (`/admin/tables`)
- **Table Inventory**: View all pool and snooker tables
- **Table Details**: Table number, type, status, hourly rate
- **Add New Table**: Create new tables via modal
- **Edit Tables**: Modify table details
- **Toggle Active**: Enable/disable tables
- **Delete Tables**: Remove tables from inventory
- **Status Indicators**: Available, Booked, Maintenance

### 4. Customers Management (`/admin/customers`)
- **Customer Database**: View all registered customers
- **Search**: Search by name, email, or phone
- **Customer Stats**: Total bookings, total spent per customer
- **Contact Info**: Email and phone display
- **Booking History**: Last booking date
- **Join Date**: When customer registered
- **Pagination**: 10 customers per page

### 5. Payments Management (`/admin/payments`)
- **Payment Overview**: Total revenue, pending, refunded amounts
- **Payment List**: All transactions with details
- **Search**: Search by customer, transaction ID, or booking ID
- **Filter**: Filter by payment status
- **Refund Processing**: One-click refund for paid payments
- **Transaction Details**: Transaction ID, booking ID, customer, amount
- **Status Tracking**: Pending, Paid, Failed, Refunded

### 6. Settings (`/admin/settings`)
- **Business Settings**:
  - Business name and tagline
  - Address and contact info
  - Opening/closing hours
- **Pricing Settings**:
  - Pool table hourly rate
  - Snooker table hourly rate
  - Advance payment amount
- **Payment Settings**:
  - Razorpay key ID and secret
  - Currency configuration
- **Notification Settings**:
  - Email notifications toggle
  - SMS notifications toggle
  - Booking confirmations toggle
  - Payment alerts toggle

## UI Components Used

### shadcn/ui Components
- **Card**: For content containers
- **Table**: For data display
- **Button**: For actions
- **Input**: For search and forms
- **Select**: For dropdowns
- **Dialog**: For modals
- **Dropdown Menu**: For action menus
- **Tabs**: For settings sections

### Custom Components
- **AdminSidebar**: Navigation sidebar with menu items
- **AdminDashboard**: Dashboard with stats and recent bookings
- **AdminBookings**: Bookings management with table
- **AdminTables**: Tables management
- **AdminCustomers**: Customer database
- **AdminPayments**: Payment tracking
- **AdminSettings**: Configuration panel

## API Endpoints

### Dashboard Stats
```
GET /api/admin/dashboard
```
Returns dashboard statistics and recent bookings.

### Bookings API
```
GET /api/admin/bookings?page=1&limit=10&status=all&search=query
PATCH /api/admin/bookings
Body: { bookingId, status }
```
Fetch bookings with pagination and update booking status.

### Tables API
```
GET /api/admin/tables
POST /api/admin/tables
Body: { tableNumber, type, hourlyRate }
```
Fetch all tables and create new tables.

### Customers API
```
GET /api/admin/customers?page=1&limit=10&search=query
```
Fetch customers with pagination and search.

### Payments API
```
GET /api/admin/payments?page=1&limit=10&status=all&search=query
```
Fetch payments with pagination and filters.

## Design System

### Colors
- **Background**: `#080A0A` (main), `#111615` (cards)
- **Text**: `#F4F1E8` (primary), `#929B95` (secondary)
- **Accent**: `#B6F36B` (neon lime), `#D6B36A` (gold)
- **Borders**: `rgba(255,255,255,0.1)`

### Status Colors
- **Confirmed/Paid**: Green (`bg-green-500/20 text-green-400`)
- **Pending**: Yellow (`bg-yellow-500/20 text-yellow-400`)
- **Cancelled/Failed**: Red (`bg-red-500/20 text-red-400`)
- **Completed**: Blue (`bg-blue-500/20 text-blue-400`)
- **Refunded**: Purple (`bg-purple-500/20 text-purple-400`)

### Typography
- **Headings**: Space Grotesk
- **Body**: Inter
- **Monospace**: For IDs and transaction numbers

## Features for Business Management

### 1. Booking Operations
- **Confirm Bookings**: Quick approval from pending list
- **Cancel Bookings**: Handle cancellations
- **View Details**: Complete booking information
- **Status Tracking**: Real-time status updates

### 2. Table Management
- **Inventory Control**: Add/remove tables
- **Maintenance Mode**: Mark tables for maintenance
- **Pricing Control**: Set hourly rates per table type
- **Availability**: Toggle table active status

### 3. Customer Relations
- **Customer Database**: Track all customers
- **Spending Analytics**: Total spent per customer
- **Booking History**: Customer booking patterns
- **Contact Management**: Easy access to contact info

### 4. Financial Management
- **Revenue Tracking**: Total revenue dashboard
- **Payment Processing**: View all transactions
- **Refund Management**: Process refunds
- **Payment Status**: Track payment states

### 5. Business Configuration
- **Business Info**: Update business details
- **Pricing Strategy**: Set rates for services
- **Payment Gateway**: Configure Razorpay
- **Notifications**: Control notification preferences

## Pagination System

All list views use consistent pagination:
- **Items per page**: 10
- **Page navigation**: Previous/Next buttons
- **Page numbers**: Direct page selection
- **Total count**: Shows total items
- **Range display**: Shows current range (e.g., "Showing 1 to 10 of 50")

## Search & Filter

### Search Functionality
- **Bookings**: Name, phone, table number
- **Customers**: Name, email, phone
- **Payments**: Customer, transaction ID, booking ID

### Filter Options
- **Bookings**: By status (Pending, Confirmed, Cancelled, Completed)
- **Payments**: By status (Paid, Pending, Failed, Refunded)

## Responsive Design

- **Desktop**: Full sidebar navigation
- **Tablet**: Collapsible sidebar
- **Mobile**: Bottom navigation or hamburger menu (to be implemented)

## Security Considerations

### Authentication (To Be Implemented)
- Admin login required
- Session management
- Role-based access control

### Data Protection
- Sensitive data masking (payment secrets)
- Secure API endpoints
- Input validation

## Performance Optimizations

- **Pagination**: Limits data loaded per page
- **Lazy Loading**: Components load on demand
- **Mock Data**: Currently using mock data for development
- **API Integration**: Ready for real API connection

## Future Enhancements

### Planned Features
- **Calendar View**: Visual booking calendar
- **Analytics Dashboard**: Charts and graphs
- **Export Data**: CSV/PDF export
- **Email Integration**: Send emails from admin
- **SMS Integration**: Send SMS notifications
- **Multi-location Support**: Manage multiple venues
- **Staff Management**: Assign staff to bookings
- **Inventory Management**: Track equipment and supplies
- **Reports**: Generate business reports

### UI Improvements
- **Dark/Light Mode Toggle**
- **Customizable Dashboard Widgets**
- **Draggable Layout**
- **Keyboard Shortcuts**
- **Bulk Actions**
- **Advanced Filters**

## Setup Instructions

### 1. Install Required Dependencies
```bash
npm install @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

### 2. Access Admin Panel
Navigate to `/admin` in your browser.

### 3. Configure Authentication (Future)
Set up admin credentials in database.

### 4. Connect Real APIs
Replace mock data with real API calls in components.

## Testing Checklist

- [ ] Dashboard stats display correctly
- [ ] Bookings list loads with pagination
- [ ] Search functionality works
- [ ] Status filters work
- [ ] Booking details modal opens
- [ ] Status changes update correctly
- [ ] Tables list displays
- [ ] Add table modal works
- [ ] Table status toggles
- [ ] Customer search works
- [ ] Payments list loads
- [ ] Refund action works
- [ ] Settings save correctly
- [ ] All components responsive

## Troubleshooting

### Common Issues

1. **Components not rendering**
   - Check if all shadcn/ui dependencies are installed
   - Verify import paths

2. **API calls failing**
   - Ensure API routes are created
   - Check database connection
   - Verify Prisma schema

3. **Pagination not working**
   - Check page state management
   - Verify filter logic

4. **Styles not applying**
   - Ensure Tailwind CSS is configured
   - Check custom color values

## Support

For issues or questions:
- Check component documentation
- Review API endpoint logs
- Verify database schema matches
