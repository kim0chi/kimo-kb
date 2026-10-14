export default defineEventHandler(() => ({
  host: process.env.KB_DEPLOYMENT_HOST || 'Local preview',
  privateUrl: process.env.KB_PRIVATE_URL || '',
}))
