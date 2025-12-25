// i18n 类型声明
export interface TranslationResources {
  navbar: {
    title: string;
    menu: string;
    dashboard: string;
    statistics: string;
    settings: string;
    about: string;
    logs: string;
  };
  common: {
    language: string;
    chinese: string;
    english: string;
  };
  stats: {
    title: string;
    description: string;
    getStatsButton: string;
    getActiveConnectionsButton: string;
    activeConnections: string;
    statsData: string;
    totalRequests: string;
    totalBytesUp: string;
    totalBytesDown: string;
    avgDuration: string;
    topHosts: string;
    recentRecords: string;
    host: string;
    visits: string;
    duration: string;
    status: {
      success: string;
      error: string;
      timeout: string;
      name: string;
    };
    loading: string;
    errorFetching: string;
    topHostsVisitCount: string;
    trafficComparison: string;
    responseTimeTrend: string;
    visitCount: string;
    upload: string;
    download: string;
    responseTime: string;
    queryParams: string;
    startTime: string;
    endTime: string;
    requestType: string;
    all: string;
    limit: string;
    page: string;
    pageSize: string;
    autoRefresh: string;
    refreshInterval: string;
    refreshIntervalHelper: string;
    timestamp: string;
    targetHost: string;
    targetPort: string;
    clientIP: string;
    bytesUp: string;
    bytesDown: string;
  };
  logs: {
    title: string;
    connecting: string;
    connectionError: string;
  };
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: TranslationResources;
    };
  }
}
