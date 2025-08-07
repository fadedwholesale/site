# Faded Skies Cannabis Wholesale Portal

A complete wholesale cannabis portal system with both public and admin interfaces.

## 🌿 Overview

This application provides a comprehensive cannabis wholesale management system with:

- **Public Portal**: Partner registration, live inventory viewing, and wholesale information
- **Admin Dashboard**: Complete inventory management, order processing, partner administration, and analytics

## 🚀 Quick Start

### Development Server
```bash
npm run dev          # Start server and open navigation page
npm run portal       # Start server and open public portal directly  
npm run admin        # Start server and open admin dashboard directly
```

### Production
```bash
npm start           # Start production server on port 3000
```

## 🔐 Demo Credentials

### Partner Portal
- **Email**: `partner@store.com`
- **Password**: `partner123`

### Admin Dashboard  
- **Email**: `admin@fadedskies.com`
- **Password**: `admin123`

## 📁 File Structure

- `index.html` - Navigation page with links to both portals
- `faded_skies_portal-5.html` - Public partner portal
- `fadedskies admin almost complete .html` - Admin dashboard
- `package.json` - Node.js configuration and scripts

## 🌐 Portal Features

### Public Portal (`faded_skies_portal-5.html`)
- Partner registration and login
- Live inventory viewing with real-time sync
- Product catalog with images and pricing
- Shopping cart and order management
- Partner dashboard with order history
- Responsive design for mobile/desktop

### Admin Dashboard (`fadedskies admin almost complete .html`)
- Complete inventory management
- Order processing and tracking
- Partner relationship management
- Real-time analytics and reporting
- Bulk operations (pricing, imports, emails)
- Security and audit logs

## 🔄 Data Synchronization

Both portals share the same data structures and sync in real-time:
- Product inventory updates automatically
- Orders appear instantly in admin dashboard
- Partner data syncs between systems
- Pricing changes reflect immediately

## 🛠️ Technical Details

### Stack
- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **Server**: http-server for static file serving
- **Styling**: Custom CSS with modern design patterns
- **Data**: JavaScript objects (simulated backend)

### Browser Support
- Chrome/Edge/Firefox (modern versions)
- Safari (mobile and desktop)
- Responsive design for all screen sizes

## 📱 Mobile Support

Both portals are fully responsive and include:
- Touch-optimized interface
- Mobile navigation patterns
- Optimized layouts for small screens
- Touch event handling

## 🔒 Security Features

- Login authentication for both portals
- Role-based access control
- Password reset functionality
- Security audit logging
- IP tracking and monitoring

## 🎯 Key Integrations

- Real-time inventory sync
- Automated order processing
- Email notification system
- Tracking number generation
- Analytics and reporting
- Partner tier management

## 📊 Analytics & Reporting

- Order volume and revenue tracking
- Partner performance metrics
- Inventory turnover analysis
- Fulfillment rate monitoring
- Growth and trend analysis
- Executive reporting

## 🚚 Order Management

- Real-time order tracking
- Automated status updates
- Shipping label generation
- Customer notifications
- Bulk operations
- Inventory synchronization

## 🔧 Development

The application uses static HTML files with embedded JavaScript for simplicity and performance. No build process is required.

### Local Development
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Access at `http://localhost:3000`

### Customization
- Update product data in JavaScript arrays
- Modify styling in embedded CSS
- Add new features in JavaScript functions
- Configure email templates and notifications

## 📞 Support

- **Email**: info@fadedskieswholesale.com
- **Phone**: (210) 835-7834
- **Location**: Austin, TX

## 📄 License

MIT License - See package.json for details
