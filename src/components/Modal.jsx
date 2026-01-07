import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with fade-in animation */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        style={{ 
          animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9998
        }}
        onClick={onClose}
      />

      {/* Modal panel with slide and scale animation */}
      <div 
        className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <div 
          className="bg-white rounded-3xl text-left shadow-2xl w-full max-w-lg pointer-events-auto border-2 border-blue-100 my-8 max-h-[90vh] flex flex-col overflow-hidden"
          style={{ animation: 'modalSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-jira-blue to-blue-600 text-white px-6 py-5 relative flex-shrink-0">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 -translate-y-16" style={{ animation: 'pulse 3s ease-in-out infinite' }}></div>
            </div>
            
            <div className="relative flex items-center justify-between">
              <h3 
                className="text-2xl font-bold"
                style={{ animation: 'slideInLeft 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:rotate-180 hover:scale-110 cursor-pointer"
                style={{ zIndex: 50 }}
                aria-label="Close modal"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div 
            className="px-6 py-6 overflow-y-auto flex-1"
            style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}
          >
            {children}
          </div>

          {/* Footer (if provided) */}
          {footer && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Modal;

