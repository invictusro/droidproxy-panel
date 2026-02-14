declare module '@stoplight/elements' {
  import * as React from 'react';

  export interface APIProps {
    apiDescriptionUrl?: string;
    apiDescriptionDocument?: string | object;
    basePath?: string;
    layout?: 'sidebar' | 'stacked';
    router?: 'hash' | 'memory' | 'history';
    hideSchemas?: boolean;
    hideTryIt?: boolean;
    hideExport?: boolean;
    hideInternal?: boolean;
    logo?: string;
    tryItCredentialsPolicy?: 'omit' | 'same-origin' | 'include';
    tryItCorsProxy?: string;
  }

  export const API: React.FC<APIProps>;
}
