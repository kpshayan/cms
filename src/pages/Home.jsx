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
  Layers
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: CheckCircle2,
      title: 'Task Management',
      description: 'Organize and prioritize tasks with our intuitive interface'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together seamlessly with your team members'
    },
    {
      icon: TrendingUp,
      title: 'Roadmap Planning',
      description: 'Sequence milestones and releases with confidence'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Get insights into team performance and productivity'
    },
    {
      icon: GitBranch,
      title: 'Agile Workflows',
      description: 'Implement Scrum and Kanban methodologies effortlessly'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security for your project data'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[var(--bg-body)] dark:text-[var(--text-primary)]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-[#050f23] dark:via-[#081226] dark:to-[#101a32]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center bg-blue-100 text-jira-blue px-4 py-2 rounded-full mb-6 dark:bg-white/10 dark:text-white">
                <Zap className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Powerful Project Management</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-jira-gray mb-6 leading-tight dark:text-white">
                Manage Projects
                <span className="block text-jira-blue">Like a Pro</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed dark:text-gray-300">
                The ultimate hub for modern teams. Prioritize work, track progress,
                and deliver exceptional results together.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link 
                  to="/auth?mode=signup"
                  className="bg-jira-blue text-white px-8 py-4 rounded-xl hover:bg-jira-blue-light transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center group"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="mt-12 flex items-center justify-center md:justify-start space-x-8">
                <div>
                  <p className="text-3xl font-bold text-jira-blue">10K+</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Active Users</p>
                </div>
                <div className="h-12 w-px bg-gray-300"></div>
                <div>
                  <p className="text-3xl font-bold text-jira-blue">50K+</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Projects Created</p>
                </div>
                <div className="h-12 w-px bg-gray-300"></div>
                <div>
                  <p className="text-3xl font-bold text-jira-blue">98%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Satisfaction</p>
                </div>
              </div>
            </div>

            {/* Right Image/Illustration */}
            <div className="relative">
              <div className="relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop" 
                  alt="Team collaboration"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-jira-blue opacity-10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-jira-gray mb-4 dark:text-white">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto dark:text-gray-300">
              Powerful features designed to help your team collaborate and deliver projects faster
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl border border-gray-200 hover:border-jira-blue hover:shadow-lg transition-all duration-200 group bg-white/80 dark:bg-[var(--bg-surface)]/80 dark:border-white/10 dark:hover:border-jira-blue/60"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-jira-blue transition-colors dark:bg-white/10">
                  <feature.icon className="w-6 h-6 text-jira-blue group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-jira-gray mb-2 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="py-20 bg-jira-bg dark:bg-[#0b1426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-jira-gray mb-4 dark:text-white">
              Intuitive Interface
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Clean, modern design that your team will love
            </p>
          </div>
          
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&h=600&fit=crop" 
              alt="Dashboard preview"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-jira-blue to-jira-blue-light dark:from-[#0b1125] dark:to-[#111b36]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to boost your team's productivity?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of teams already using ProjectFlow
          </p>
          <Link 
            to="/auth?mode=signup"
            className="inline-flex items-center bg-white text-jira-blue px-8 py-4 rounded-xl hover:shadow-2xl transition-all duration-200 font-semibold text-lg group"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-jira-gray text-white py-12 dark:bg-[#040814]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-jira-blue" />
                </div>
                <span className="font-bold text-lg">ProjectFlow</span>
              </div>
              <p className="text-gray-400 text-sm">
                The modern way to manage your Scrum projects
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Updates</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 ProjectFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
