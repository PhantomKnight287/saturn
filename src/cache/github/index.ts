import { memoize } from 'nextjs-better-unstable-cache'
import { GithubCacheKeys } from './keys'

export const getGithubStars = memoize(
  async (repo: string) => {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) {
      return null
    }
    const data = (await res.json()) as { stargazers_count?: number }
    return data.stargazers_count ?? null
  },
  {
    /// 1 hr
    duration: 3600,
    revalidateTags: (repo) => GithubCacheKeys.getGithubStars(repo),
    log: ['verbose'],
    logid: 'GitHub Stars',
  }
)
