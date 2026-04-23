import { memoize } from 'nextjs-better-unstable-cache'
import { GithubCacheKeys } from './keys'

export const getGithubStars = memoize(
  async (repo: string) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      })

      if (!res.ok) {
        return null
      }

      const data = (await res.json()) as { stargazers_count?: number }
      return typeof data.stargazers_count === 'number'
        ? data.stargazers_count
        : null
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  },
  {
    /// 1 hr
    duration: 3600,
    revalidateTags: (repo) => GithubCacheKeys.getGithubStars(repo),
    log: ['verbose'],
    logid: 'GitHub Stars',
  }
)
