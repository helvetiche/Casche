"use client";

const AuthCard = () => {
  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-amber-50 rounded-none brutal-shadow brutal-border p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-amber-50 mb-4 brutal-border mx-auto">
            <img
              src="/logo.png"
              alt="Casche Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h1 className="text-3xl font-heading font-medium uppercase text-emerald-900 mb-2 tracking-wider text-center">
            Casche
          </h1>
          <p className="text-emerald-900 font-mono text-xs tracking-wide text-center">
            [ Track your expenses and savings with ease ]
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-emerald-900 font-mono tracking-wide">
            Made with love by Nasche Del Ponso
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCard;
