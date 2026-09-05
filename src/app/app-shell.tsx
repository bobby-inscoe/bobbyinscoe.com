import { Outlet } from '@tanstack/react-router';
import type React from 'react';

export function AppShell(): React.JSX.Element {
  return (
    <div className="App">
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
