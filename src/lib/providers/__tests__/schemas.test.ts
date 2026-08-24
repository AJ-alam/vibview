import { describe, it, expect } from "vitest";
import tikwmUser from "../__fixtures__/tikwm-user.json";
import tikwmPosts from "../__fixtures__/tikwm-posts.json";
import tikwmVideo from "../__fixtures__/tikwm-video.json";
import scrapeUser from "../__fixtures__/scrape-user.json";

import {
  TikwmUserInfoResponseSchema,
  TikwmUserPostsResponseSchema,
  TikwmVideoDetailResponseSchema,
  tikwmVideoToPost,
} from "../types";
import { z } from "zod";

const ScrapeUserSchema = z.object({
  userInfo: z.object({
    user: z.object({
      uid: z.string(),
      uniqueId: z.string(),
      nickname: z.string(),
      avatarLarger: z.string().optional().default(""),
      signature: z.string().optional().default(""),
      verified: z.boolean().optional().default(false),
      region: z.string().optional().default(""),
    }),
    stats: z.object({
      followerCount: z.number().optional().default(0),
      followingCount: z.number().optional().default(0),
      heartCount: z.union([z.string(), z.number()]).transform(Number).optional().default(0),
      videoCount: z.number().optional().default(0),
    }),
  }),
});

describe("tikwm schemas", () => {
  it("parses tikwm-user fixture without throwing", () => {
    const result = TikwmUserInfoResponseSchema.parse(tikwmUser);
    expect(result.code).toBe(0);
    expect(result.data.user.unique_id).toBe("testuser");
    expect(result.data.user.verified).toBe(false);
  });

  it("parses tikwm-posts fixture and returns correct post count", () => {
    const result = TikwmUserPostsResponseSchema.parse(tikwmPosts);
    expect(result.code).toBe(0);
    expect(result.data.videos).toHaveLength(2);
    expect(result.data.has_more).toBe(true);
    expect(result.data.cursor).toBe("30");
  });

  it("maps tikwm video item to internal Post type", () => {
    const result = TikwmUserPostsResponseSchema.parse(tikwmPosts);
    const post = tikwmVideoToPost(result.data.videos[0], "testuser");
    expect(post.id).toBe("7123456789012345678");
    expect(post.views).toBe(1500000);
    expect(post.likes).toBe(80000);
    expect(post.videoUrlHd).toBeDefined();
    expect(post.music?.title).toBe("Original Sound");
    expect(post.authorUsername).toBe("testuser");
  });

  it("handles image-only (photo carousel) post", () => {
    const result = TikwmUserPostsResponseSchema.parse(tikwmPosts);
    const imagePost = tikwmVideoToPost(result.data.videos[1], "testuser");
    expect(imagePost.images).toHaveLength(2);
    expect(imagePost.videoUrl).toBe("");
  });

  it("parses tikwm-video fixture", () => {
    const result = TikwmVideoDetailResponseSchema.parse(tikwmVideo);
    expect(result.code).toBe(0);
    const post = tikwmVideoToPost(result.data, "testuser");
    expect(post.hashtags).toContain("viral");
    expect(post.hashtags).toContain("fyp");
  });
});

describe("scrape schema", () => {
  it("parses scrape-user fixture", () => {
    const result = ScrapeUserSchema.parse(scrapeUser);
    expect(result.userInfo.user.uniqueId).toBe("testuser");
    expect(result.userInfo.stats.followerCount).toBe(10000);
  });
});

describe("tikwm error responses", () => {
  it("throws ZodError on malformed user response", () => {
    expect(() =>
      TikwmUserInfoResponseSchema.parse({ code: 0, msg: "ok", data: {} })
    ).toThrow();
  });

  it("handles number-as-string for total_favorited", () => {
    const modified = {
      ...tikwmUser,
      data: {
        ...tikwmUser.data,
        user: { ...tikwmUser.data.user, total_favorited: "999999" },
      },
    };
    const result = TikwmUserInfoResponseSchema.parse(modified);
    expect(result.data.user.total_favorited).toBe(999999);
  });
});
