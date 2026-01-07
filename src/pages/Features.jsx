import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  Clock,
  Zap,
  Shield,
  BarChart3,
  GitBranch,
  ArrowRight,
  Bell,
  Calendar,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  Settings,
  Star
} from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: CheckCircle2,
      title: 'Task Management',
      description: 'Create, assign, and track tasks with intuitive drag-and-drop interfaces',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with real-time updates and shared workspaces',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'Roadmap Planning',
      description: 'Plan milestones and releases with confidence and transparency',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Get insights into team performance with detailed analytics and custom reports',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      icon: GitBranch,
      title: 'Agile Workflows',
      description: 'Implement Scrum, Kanban, or custom workflows that fit your team',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with role-based access control and data encryption',
      color: 'bg-red-100 text-red-600'
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Stay updated with intelligent notifications and custom alert settings',
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      icon: Calendar,
      title: 'Timeline Views',
      description: 'Visualize project timelines and dependencies with Gantt charts',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      icon: FileText,
      title: 'Documentation',
      description: 'Create and maintain project documentation directly within tasks',
      color: 'bg-teal-100 text-teal-600'
    },
    {
      icon: Filter,
      title: 'Advanced Filtering',
      description: 'Find exactly what you need with powerful search and filter options',
      color: 'bg-cyan-100 text-cyan-600'
    },
    {
      icon: MessageSquare,
      title: 'Comments & Mentions',
      description: 'Collaborate with threaded comments and @mentions on any task',
      color: 'bg-lime-100 text-lime-600'
    },
    {
      icon: Settings,
      title: 'Customizable',
      description: 'Adapt the platform to your needs with custom fields and workflows',
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center bg-blue-100 text-jira-blue px-4 py-2 rounded-full mb-6">
            <Star className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Powerful Features</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-jira-gray mb-6">
            Everything you need to
            <span className="block text-jira-blue">manage projects</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            From planning to delivery, ProjectFlow has all the tools your team needs 
            to collaborate effectively and ship faster.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-8 rounded-2xl border border-gray-200 hover:border-jira-blue hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-jira-gray mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-jira-blue to-jira-blue-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of teams already using ProjectFlow
          </p>
          <Link 
            to="/signup"
            className="inline-flex items-center bg-white text-jira-blue px-8 py-4 rounded-xl hover:shadow-2xl transition-all duration-200 font-semibold text-lg group"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Features;
