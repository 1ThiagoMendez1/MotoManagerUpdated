const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/DashboardMenu.tsx', 'utf-8');

// Replace AppleGlassCard inner content class
content = content.replace(
  /border border-foreground\/\[0\.08\] dark:border-white\/\[0\.1\] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground\/\[0\.06\] dark:hover:bg-white\/\[0\.08\] hover:border-foreground\/\[0\.15\] dark:hover:border-white\/\[0\.2\] active:scale-\[0\.98\] flex flex-col min-w-0 transform-gpu translate-z-0 will-change-transform/g,
  'ring-1 ring-inset ring-foreground/[0.08] dark:ring-white/[0.1] shadow-lg overflow-hidden transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:ring-foreground/[0.15] dark:hover:ring-white/[0.2] active:scale-[0.98] flex flex-col min-w-0'
);

// Replace AppleGlassCardSmall inner content class
content = content.replace(
  /border border-foreground\/\[0\.08\] dark:border-white\/\[0\.1\] transition-all duration-300 hover:bg-foreground\/\[0\.06\] dark:hover:bg-white\/\[0\.08\] hover:border-foreground\/\[0\.15\] dark:hover:border-white\/\[0\.2\] active:scale-\[0\.98\] min-w-0 transform-gpu translate-z-0 will-change-transform/g,
  'ring-1 ring-inset ring-foreground/[0.08] dark:ring-white/[0.1] transition-all duration-300 hover:bg-foreground/[0.06] dark:hover:bg-white/[0.08] hover:ring-foreground/[0.15] dark:hover:ring-white/[0.2] active:scale-[0.98] min-w-0'
);

fs.writeFileSync('src/components/dashboard/DashboardMenu.tsx', content);
