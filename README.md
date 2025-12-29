# Casche

A modern, secure personal finance application built with Next.js for managing savings goals, tracking transactions, and collaborating with friends. Casche provides an intuitive interface for setting financial targets, monitoring progress, and building healthy saving habits.

## Overview

Casche is a full-stack web application that combines powerful financial tracking capabilities with social features, enabling users to create and manage multiple savings goals while staying connected with friends. The platform emphasizes security, performance, and user experience through modern web technologies and best practices.

## Features

### Core Functionality

- **Savings Goals Management**: Create, update, and track multiple savings goals with custom targets and deadlines
- **Transaction Tracking**: Record deposits and withdrawals with detailed transaction history
- **Quick Submit Actions**: Pre-configured quick action buttons for common transaction amounts
- **Goal Sharing**: Share goals with friends and collaborate on shared financial objectives
- **Progress Analytics**: Visual analytics and charts to track savings progress over time
- **Wallet Dashboard**: Comprehensive overview of total savings across all goals

### Social Features

- **Friends System**: Add friends, send friend requests, and manage your social network
- **Goal Collaboration**: Invite friends to join your savings goals and work together
- **Goal Requests**: Send and receive requests to join shared goals
- **User Search**: Discover and connect with other users on the platform
- **Messaging**: Built-in messaging system for communication

### Security & Performance

- **Google Authentication**: Secure OAuth-based authentication via Firebase
- **CSRF Protection**: Cross-site request forgery protection on all state-changing operations
- **Rate Limiting**: Distributed rate limiting using Upstash Redis to prevent abuse
- **Audit Logging**: Comprehensive audit trail for security and compliance
- **Request Validation**: Input validation and sanitization on all API endpoints
- **Secure API Routes**: Server-side API routes with authentication middleware
- **Progressive Web App**: PWA support for offline functionality and app-like experience

### User Experience

- **Modern UI**: Neo-brutalist design with TailwindCSS and custom styling
- **Responsive Design**: Fully responsive interface optimized for mobile and desktop
- **Real-time Updates**: Instant UI updates reflecting transaction and goal changes
- **Loading States**: Thoughtful loading indicators and skeleton screens
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Accessibility**: Built with accessibility best practices in mind

## Technology Stack

### Frontend

- **Next.js 16**: React framework with App Router for optimal performance
- **React 19**: Latest React features with concurrent rendering
- **TypeScript**: Type-safe development with comprehensive type definitions
- **TailwindCSS 4**: Utility-first CSS framework for rapid UI development
- **Phosphor Icons**: Modern icon library for consistent visual language
- **Recharts**: Powerful charting library for analytics visualization

### Backend

- **Next.js API Routes**: Serverless API endpoints with built-in routing
- **Firebase Admin SDK**: Server-side Firebase operations and authentication
- **Firebase Authentication**: Google Sign-In integration
- **Firestore**: NoSQL database for real-time data storage
- **Upstash Redis**: Distributed rate limiting and caching
- **Zod**: Schema validation for runtime type checking

### Development Tools

- **ESLint**: Code linting and quality assurance
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing and optimization

## Design System

Casche features a distinctive neo-brutalist design aesthetic that combines bold visual elements with clean, functional interfaces. The design system emphasizes clarity, accessibility, and a modern visual language that makes financial data approachable and engaging.

### Design Philosophy

The application follows a neo-brutalist design approach characterized by:

- **Bold Typography**: Strong, monospace typography for clear hierarchy and readability
- **High Contrast**: Distinct color contrasts for improved accessibility and visual impact
- **Geometric Shapes**: Clean, geometric forms with defined borders and shadows
- **Grid-Based Layouts**: Structured grid systems for consistent spacing and alignment
- **Functional Aesthetics**: Design that prioritizes usability without sacrificing visual appeal

### Color Palette

The color system is built around a carefully curated palette that balances professionalism with visual interest:

#### Primary Colors

- **Emerald Green** (`#059669`): Primary accent color representing growth, progress, and financial success
- **Emerald Light** (`#d1fae5`): Light variant for backgrounds and subtle accents
- **Amber** (`#fef3c7`): Warm background tones creating a welcoming atmosphere
- **Amber Dark** (`#f59e0b`): Secondary accent for highlights and important elements

#### Neutral Colors

- **Gray-900** (`#111827`): Primary text color for maximum readability
- **Gray-600** (`#6b7280`): Secondary text for supporting information
- **Gray-400** (`#9ca3af`): Tertiary text for less prominent content
- **White** (`#ffffff`): Clean backgrounds and card surfaces

#### Semantic Colors

- **Success** (`#10b981`): Emerald-500 for positive actions and confirmations
- **Warning** (`#f59e0b`): Amber-500 for cautionary states
- **Error** (`#ef4444`): Red-500 for errors and destructive actions
- **Info** (`#3b82f6`): Blue-500 for informational messages

### Typography

The application uses **JetBrains Mono** as the primary typeface, a monospace font that provides:

- **Consistency**: Uniform character width for aligned data display
- **Readability**: Excellent legibility at various sizes
- **Technical Aesthetic**: Modern, developer-friendly appearance
- **Character Clarity**: Distinct characters reducing confusion in financial data

#### Font Weights

- **300**: Light weight for subtle text and labels
- **400**: Regular weight for body text (default)
- **500**: Medium weight for emphasis and secondary headings
- **700**: Bold weight for primary headings and important information

#### Typography Scale

- **Display**: Large headings for page titles and hero sections
- **Heading**: Section headers and card titles
- **Body**: Primary content and descriptions
- **Small**: Labels, captions, and metadata
- **Monospace**: Financial figures, IDs, and technical data

### UI Components

#### Cards

Cards serve as the primary container component throughout the application:

- **Wallet Card**: Premium gradient card displaying total savings with decorative elements
- **Goal Cards**: Individual goal containers with progress indicators
- **Transaction Cards**: Clean cards for transaction history
- **Friend Cards**: Profile cards for social features

Card styling includes:

- Rounded corners (`rounded-2xl`, `rounded-lg`)
- Subtle shadows for depth (`shadow-2xl`, `card-shadow`)
- Defined borders for structure (`border`, `border-emerald-900`)
- Padding for comfortable spacing

#### Buttons

Button components follow consistent patterns:

- **Primary Actions**: Emerald background with amber text for main CTAs
- **Secondary Actions**: Outlined buttons with emerald borders
- **Danger Actions**: Red variants for destructive operations
- **Icon Buttons**: Circular buttons with Phosphor icons

#### Modals

Modal dialogs feature:

- Backdrop overlays for focus
- Centered positioning with responsive sizing
- Clear close actions
- Consistent padding and spacing
- Smooth animations for open/close states

#### Forms

Form elements maintain:

- Clear labels and placeholders
- Consistent input styling
- Validation states with color coding
- Accessible error messages
- Touch-friendly input sizes on mobile

### Visual Elements

#### Grid Backgrounds

Subtle grid patterns provide visual structure:

- Light emerald grid lines (`rgba(34, 197, 94, 0.1)`)
- 20px grid spacing for consistent rhythm
- Applied to background surfaces for depth

#### Shadows

Shadow system creates hierarchy:

- **Brutal Shadow**: Bold, offset shadows (`4px 4px 0px`) for neo-brutalist effect
- **Card Shadow**: Subtle shadows for elevation
- **Depth Layers**: Multiple shadow levels for component hierarchy

#### Borders

Border system emphasizes structure:

- **Primary Borders**: 3px solid borders for emphasis
- **Subtle Borders**: 1px borders for separation
- **Color-Coded**: Emerald borders for primary elements

#### Icons

Phosphor Icons provide:

- Consistent icon style throughout the application
- Multiple weights (regular, fill, bold) for hierarchy
- Scalable vector graphics
- Semantic icon choices aligned with functionality

### Layout Principles

#### Spacing System

Consistent spacing using Tailwind's scale:

- **Tight**: 2-4px for closely related elements
- **Normal**: 6-8px for standard component spacing
- **Loose**: 12-16px for section separation
- **Extra Loose**: 24-32px for major section breaks

#### Responsive Breakpoints

- **Mobile**: Default styles optimized for mobile-first
- **Tablet**: `sm:` breakpoint (640px+) for enhanced layouts
- **Desktop**: `lg:` breakpoint (1024px+) for full desktop experience

#### Grid System

- Flexible grid layouts using CSS Grid and Flexbox
- Responsive columns that adapt to screen size
- Consistent gutters and margins
- Alignment utilities for precise positioning

### Accessibility

Design decisions prioritize accessibility:

- **Color Contrast**: WCAG AA compliant contrast ratios
- **Touch Targets**: Minimum 44x44px touch targets for mobile
- **Focus States**: Clear focus indicators for keyboard navigation
- **Screen Readers**: Semantic HTML and ARIA labels
- **Text Scaling**: Responsive text that scales appropriately

### Animation & Transitions

Subtle animations enhance user experience:

- **Loading States**: Skeleton screens and spinners
- **Transitions**: Smooth state changes (150-300ms)
- **Hover Effects**: Interactive feedback on clickable elements
- **Typewriter Effects**: Animated text reveals for engagement

### Design Tokens

The design system uses CSS custom properties for consistency:

```css
--bg-primary: #ffffff
--text-primary: #111827
--accent-emerald: #059669
--accent-emerald-light: #d1fae5
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6
```

These tokens enable easy theming and maintainability across the application.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Firebase project with Authentication enabled
- (Optional) Upstash Redis account for distributed rate limiting

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/casche.git
cd casche
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key

# Firebase Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Optional: Upstash Redis (for distributed rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional: Environment Configuration
NODE_ENV=development
ENABLE_AUDIT_LOGS=false
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
casche/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── analytics/     # Analytics endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── friends/       # Friends management endpoints
│   │   ├── goals/         # Goals management endpoints
│   │   ├── messages/      # Messaging endpoints
│   │   └── users/         # User search endpoints
│   ├── dashboard/         # Dashboard page
│   ├── friends/           # Friends page
│   ├── goals/             # Goals page
│   └── settings/          # Settings page
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── friends/           # Friends-related components
│   └── goals/             # Goals-related components
├── context/               # React context providers
├── lib/                   # Utility libraries and helpers
│   ├── api-client.ts      # API client utilities
│   ├── audit-logger.ts    # Audit logging system
│   ├── auth-middleware.ts # Authentication middleware
│   ├── csrf-middleware.ts # CSRF protection middleware
│   ├── firebase-admin.ts  # Firebase Admin SDK setup
│   ├── firebase.ts        # Firebase client setup
│   ├── rate-limiter.ts    # Rate limiting implementation
│   ├── security-utils.ts  # Security utilities
│   └── types/             # TypeScript type definitions
├── public/                # Static assets
└── hooks/                 # Custom React hooks
```

## API Documentation

### Authentication

All API endpoints require authentication via Bearer token in the Authorization header. CSRF protection is enforced on state-changing operations.

### Endpoints

- `GET /api/auth/session` - Get current user session
- `POST /api/auth/set-claims` - Set custom user claims
- `GET /api/auth/csrf-token` - Get CSRF token for protected operations

### Goals

- `GET /api/goals` - List user's goals
- `POST /api/goals` - Create a new goal
- `GET /api/goals/[goalId]` - Get goal details
- `PUT /api/goals/[goalId]` - Update a goal
- `DELETE /api/goals/[goalId]` - Delete a goal
- `POST /api/goals/[goalId]/transactions` - Create a transaction
- `POST /api/goals/[goalId]/share` - Share a goal with a user
- `GET /api/goals/requests` - Get goal requests
- `POST /api/goals/requests` - Accept or decline goal requests

### Friends

- `GET /api/friends` - List user's friends
- `POST /api/friends` - Send a friend request
- `GET /api/friends/requests` - Get friend requests
- `POST /api/friends/requests` - Accept or decline friend requests

### Analytics

- `GET /api/analytics/transactions` - Get transaction analytics

### Users

- `GET /api/users/search` - Search for users

## Security Features

### Authentication & Authorization

- Firebase Authentication with Google Sign-In
- JWT token validation on all API routes
- Custom claims for role-based access control
- Session management with secure token storage

### CSRF Protection

- CSRF tokens required for all POST, PUT, DELETE operations
- Token validation middleware on protected endpoints
- Secure token generation and validation

### Rate Limiting

- Distributed rate limiting using Upstash Redis
- Configurable limits per endpoint
- Automatic fallback to in-memory rate limiting if Redis unavailable
- Per-user and per-IP rate limiting strategies

### Audit Logging

- Comprehensive audit trail for all critical operations
- Logs include user ID, IP address, user agent, and action details
- Configurable logging levels for development and production
- Security event tracking for compliance

### Input Validation

- Zod schema validation on all API inputs
- Request size limits to prevent DoS attacks
- Sanitization of user inputs
- Type-safe request/response handling

## Performance Optimizations

- **Static Generation**: Pre-rendered pages where possible for optimal performance
- **Dynamic Imports**: Code splitting for reduced initial bundle size
- **Image Optimization**: Next.js Image component for optimized asset delivery
- **API Route Optimization**: Efficient database queries and caching strategies
- **Bundle Analysis**: Tools for identifying and optimizing large dependencies

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run audit` - Run security audit
- `npm run audit:fix` - Fix security vulnerabilities
- `npm run security:check` - Check for moderate+ security issues

### Code Style

- TypeScript strict mode enabled
- ESLint configuration with Next.js rules
- Consistent code formatting with Prettier (if configured)
- Component-based architecture with reusable components

## Deployment

### Vercel (Recommended)

The easiest way to deploy Casche is using the [Vercel Platform](https://vercel.com):

1. Push your code to GitHub
2. Import your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

Vercel automatically detects Next.js and optimizes the deployment.

### Other Platforms

Casche can be deployed to any platform that supports Next.js:

- Docker containers
- Node.js hosting providers
- Serverless platforms

Ensure all environment variables are configured in your deployment environment.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure code passes linting and type checking

## License

This project is private and proprietary. All rights reserved.

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

## Acknowledgments

Built with modern web technologies and best practices. Special thanks to the open-source community for the excellent tools and libraries that make this project possible.
