import React from 'react';
import WatermelonDBProvider from '@nozbe/watermelondb/react/DatabaseProvider';
import { database } from './database';

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps WatermelonDB's built-in DatabaseProvider with the app's database singleton.
 * Any child can call useDatabase() from @shared/hooks/useDatabase to access the DB.
 */
export function DatabaseProvider({ children }: Props) {
  return (
    <WatermelonDBProvider database={database}>
      {children}
    </WatermelonDBProvider>
  );
}
