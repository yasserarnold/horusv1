import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
          >
            <img 
              src="/horuseye.png" 
              alt="عقارات حورس" 
              className="w-8 h-8"
            />
            <div>
              <h1 className="text-2xl font-bold">عقارات حورس</h1>
              <p className="text-xs text-slate-300">منصتك الموثوقة للعقارات</p>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};
