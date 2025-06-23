export function Footer() {
  return (
    <footer className="bg-white border-t mt-10">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-4 px-4 gap-2">
        <div className="flex items-center gap-2 text-blue-600 font-bold">
          <i className="fa-solid fa-keyboard"></i>
          Tykon
        </div>
        
        <div className="flex gap-4 text-gray-500 text-xl">
          <a href="#" className="hover:text-blue-600 transition-colors">
            <i className="fa-brands fa-twitter"></i>
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            <i className="fa-brands fa-discord"></i>
          </a>
          <a href="#" className="hover:text-blue-600 transition-colors">
            <i className="fa-brands fa-github"></i>
          </a>
        </div>
        
        <div className="text-gray-400 text-sm">
          © 2023 SpeedType. All rights reserved.
        </div>
      </div>
    </footer>
  );
} 