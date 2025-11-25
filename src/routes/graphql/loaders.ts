import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

export type Loaders = ReturnType<typeof createLoaders>;

export const createLoaders = (prisma: PrismaClient) => {
  // Loader для постов по authorId
  const postsLoader = new DataLoader<string, Array<{ id: string; title: string; content: string; authorId: string }>>(
    async (authorIds) => {
      const posts = await prisma.post.findMany({
        where: {
          authorId: {
            in: [...authorIds],
          },
        },
      });
      const postsByAuthorId = new Map<string, typeof posts>();
      for (const post of posts) {
        const existing = postsByAuthorId.get(post.authorId) || [];
        existing.push(post);
        postsByAuthorId.set(post.authorId, existing);
      }
      return authorIds.map((id) => postsByAuthorId.get(id) || []);
    },
  );

  // Loader для профилей по userId
  const profilesLoader = new DataLoader<string, { id: string; isMale: boolean; yearOfBirth: number; userId: string; memberTypeId: string } | null>(
    async (userIds) => {
      const profiles = await prisma.profile.findMany({
        where: {
          userId: {
            in: [...userIds],
          },
        },
      });
      const profilesByUserId = new Map(profiles.map((p) => [p.userId, p]));
      return userIds.map((id) => profilesByUserId.get(id) || null);
    },
  );

  // Loader для memberTypes по id
  const memberTypesLoader = new DataLoader<string, { id: string; discount: number; postsLimitPerMonth: number } | null>(
    async (ids) => {
      const memberTypes = await prisma.memberType.findMany({
        where: {
          id: {
            in: [...ids],
          },
        },
      });
      const memberTypesById = new Map(memberTypes.map((mt) => [mt.id, mt]));
      return ids.map((id) => memberTypesById.get(id) || null);
    },
  );

  // Loader для userSubscribedTo (кто подписан на пользователя)
  const userSubscribedToLoader = new DataLoader<string, Array<{ id: string; name: string; balance: number }>>(
    async (subscriberIds) => {
      const subscriptions = await prisma.subscribersOnAuthors.findMany({
        where: {
          subscriberId: {
            in: [...subscriberIds],
          },
        },
        include: {
          author: true,
        },
      });
      const authorsBySubscriberId = new Map<string, Array<{ author: { id: string; name: string; balance: number } }>>();
      for (const sub of subscriptions) {
        const existing = authorsBySubscriberId.get(sub.subscriberId) || [];
        existing.push(sub as { author: { id: string; name: string; balance: number } });
        authorsBySubscriberId.set(sub.subscriberId, existing);
      }
      return subscriberIds.map((id) => {
        const subs = authorsBySubscriberId.get(id) || [];
        return subs.map((s) => s.author);
      });
    },
  );

  // Loader для subscribedToUser (кто подписан на пользователя)
  const subscribedToUserLoader = new DataLoader<string, Array<{ id: string; name: string; balance: number }>>(
    async (authorIds) => {
      const subscriptions = await prisma.subscribersOnAuthors.findMany({
        where: {
          authorId: {
            in: [...authorIds],
          },
        },
        include: {
          subscriber: true,
        },
      });
      const subscribersByAuthorId = new Map<string, Array<{ subscriber: { id: string; name: string; balance: number } }>>();
      for (const sub of subscriptions) {
        const existing = subscribersByAuthorId.get(sub.authorId) || [];
        existing.push(sub as { subscriber: { id: string; name: string; balance: number } });
        subscribersByAuthorId.set(sub.authorId, existing);
      }
      return authorIds.map((id) => {
        const subs = subscribersByAuthorId.get(id) || [];
        return subs.map((s) => s.subscriber);
      });
    },
  );

  return {
    postsLoader,
    profilesLoader,
    memberTypesLoader,
    userSubscribedToLoader,
    subscribedToUserLoader,
  };
};

