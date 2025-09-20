export const config = {
  github: {
    apiToken: import.meta.env.VITE_GITHUB_API_TOKEN || '',
    apiUrl: 'https://api.github.com',
  },
  appEnvironment: import.meta.env.VITE_ENVIRONMENT || 'development'
};
