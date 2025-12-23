const ThemeToggleLoading = () => (
  <div tabIndex={0} role="button" className="btn btn-square btn-ghost">
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* 外圈脉冲动画 */}
        <div className="absolute inset-0 animate-ping">
          <div className="h-6 w-6 rounded-full bg-yellow-400/20 dark:bg-yellow-300/20"></div>
        </div>
        {/* 太阳图标 */}
        <div className="relative animate-pulse">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="h-6 w-6 text-gray-400 dark:text-gray-500"
          >
            <title>Loading Theme Toggle</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

export default ThemeToggleLoading;
