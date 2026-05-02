'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Heart, MessageCircle, Share2, Users, TrendingUp,
  Clock, Tag, ArrowRight, X, LogIn, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/use-app-store';
import {
  SAMPLE_COMMUNITY_GROUPS,
  SAMPLE_COMMUNITY_POSTS,
  COMMUNITY_CATEGORIES,
} from '@/lib/constants';
import type { CommunityPost, CommunityGroup } from '@/lib/types';
import ComingSoonSection from '@/components/stayease/community/coming-soon-section';

// ─── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// ─── Post Card ─────────────────────────────────────────────
function PostCard({ post, isGuest }: { post: CommunityPost; isGuest: boolean }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    if (isGuest) return;
    setLiked((prev) => !prev);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="py-0 gap-0 overflow-hidden hover:shadow-md transition-shadow">
        {/* Author row */}
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-4 pb-2">
          <Avatar className="size-10">
            <AvatarImage src={post.authorAvatar} alt={post.authorName} />
            <AvatarFallback className="bg-brand-teal/15 text-brand-teal text-sm font-semibold">
              {post.authorName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{post.authorName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {timeAgo(post.createdAt)}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-brand-teal/10 text-brand-teal border-brand-teal/20 shrink-0 text-xs"
          >
            {post.category}
          </Badge>
        </div>

        <CardContent className="px-4 sm:px-6 pb-2">
          <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
            {post.content}
          </p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5"
                >
                  <Tag className="size-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>

        {/* Action bar */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-3 border-t border-border">
          {isGuest ? (
            <div className="flex items-center gap-4 flex-1">
              <button className="flex items-center gap-1.5 text-muted-foreground/70 cursor-not-allowed">
                <Heart className="size-4.5" />
                <span className="text-xs">{likeCount}</span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground/70 cursor-not-allowed">
                <MessageCircle className="size-4.5" />
                <span className="text-xs">{post.comments}</span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground/70 cursor-not-allowed">
                <Share2 className="size-4.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 transition-colors group"
              >
                <Heart
                  className={`size-4.5 transition-colors ${
                    liked ? 'text-red-500 fill-red-500' : 'text-muted-foreground group-hover:text-red-400'
                  }`}
                />
                <span className={`text-xs ${liked ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {likeCount}
                </span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-brand-teal transition-colors">
                <MessageCircle className="size-4.5" />
                <span className="text-xs">{post.comments}</span>
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-brand-teal transition-colors">
                <Share2 className="size-4.5" />
              </button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Group Card ────────────────────────────────────────────
function GroupCard({
  group,
  isGuest,
  onToggleJoin,
}: {
  group: CommunityGroup;
  isGuest: boolean;
  onToggleJoin: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="py-0 gap-0 overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-xl bg-gradient-to-br from-brand-deep to-brand-teal flex items-center justify-center shrink-0">
                <Users className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{group.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{group.category}</p>
              </div>
            </div>
            {isGuest ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs h-8"
                disabled
              >
                <LogIn className="size-3 mr-1" />
                Login
              </Button>
            ) : group.isJoined ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs h-8 border-brand-teal/20 text-brand-teal hover:bg-brand-teal/10"
                onClick={() => onToggleJoin(group.id)}
              >
                Joined
              </Button>
            ) : (
              <Button
                size="sm"
                className="shrink-0 text-xs h-8 bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white border-0"
                onClick={() => onToggleJoin(group.id)}
              >
                Join
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
            {group.description}
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            <span>{formatNumber(group.members)} members</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Category Chips ────────────────────────────────────────
function CategoryChips({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelect('All')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selected === 'All'
            ? 'bg-brand-teal text-white shadow-sm'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === cat
              ? 'bg-brand-teal text-white shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ─── Create Post Dialog ────────────────────────────────────
function CreatePostDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (post: { title: string; content: string; category: string; tags: string[] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, '');
      if (val && !tags.includes(val) && tags.length < 5) {
        setTags((prev) => [...prev, val]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim() || !category) return;
    onSubmit({ title: title.trim(), content: content.trim(), category, tags });
    setTitle('');
    setContent('');
    setCategory('');
    setTags([]);
    setTagInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-teal" />
            Create Post
          </DialogTitle>
          <DialogDescription>
            Share something with the StayEg community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="post-title" className="text-sm font-medium">
              Title
            </Label>
            <Input
              id="post-title"
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-content" className="text-sm font-medium">
              Content
            </Label>
            <Textarea
              id="post-content"
              placeholder="Write your post details here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {COMMUNITY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-tags" className="text-sm font-medium">
              Tags <span className="text-muted-foreground font-normal">(optional, max 5)</span>
            </Label>
            <Input
              id="post-tags"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={tags.length >= 5}
              className="h-10"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-brand-teal/10 text-brand-teal border-brand-teal/20 pr-1 gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 hover:bg-brand-teal/20 rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || !category}
            className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white border-0"
          >
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty State ───────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="size-16 rounded-2xl bg-brand-teal/10 flex items-center justify-center mb-4">
        <Icon className="size-8 text-brand-teal" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      {children}
    </motion.div>
  );
}

// ─── Main Community Page ───────────────────────────────────
export default function CommunityPage() {
  const {
    isLoggedIn,
    isGuest,
    communityPosts,
    communityGroups,
    setCommunityPosts,
    setCommunityGroups,
    showToast,
  } = useAppStore();

  // Local state
  const [activeTab, setActiveTab] = useState('posts');
  const [postCategory, setPostCategory] = useState('All');
  const [groupCategory, setGroupCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [localGroups, setLocalGroups] = useState<CommunityGroup[]>([]);

  // Initialize data
  useEffect(() => {
    if (communityPosts.length === 0) {
      setCommunityPosts(SAMPLE_COMMUNITY_POSTS);
    }
    if (communityGroups.length === 0) {
      setCommunityGroups(SAMPLE_COMMUNITY_GROUPS);
    }
  }, []);

  // Sync local state
  useEffect(() => {
    setLocalPosts(communityPosts);
  }, [communityPosts]);

  useEffect(() => {
    setLocalGroups(communityGroups);
  }, [communityGroups]);

  // Filtered posts
  const filteredPosts = localPosts.filter((post) => {
    const matchCategory = postCategory === 'All' || post.category === postCategory;
    const matchSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Filtered groups
  const filteredGroups = localGroups.filter((group) => {
    const matchCategory = groupCategory === 'All' || group.category === groupCategory;
    const matchSearch =
      !searchQuery ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Joined groups
  const joinedGroups = localGroups.filter((g) => g.isJoined);

  // Handlers
  const handleToggleJoin = useCallback(
    (groupId: string) => {
      if (isGuest) {
        showToast('Please login to join groups');
        return;
      }
      const updated = localGroups.map((g) =>
        g.id === groupId
          ? { ...g, isJoined: !g.isJoined, members: g.isJoined ? g.members - 1 : g.members + 1 }
          : g
      );
      setLocalGroups(updated);
      setCommunityGroups(updated);
      const group = updated.find((g) => g.id === groupId);
      if (group?.isJoined) {
        showToast(`Joined "${group.name}"`);
      }
    },
    [isGuest, localGroups, setCommunityGroups, showToast]
  );

  const handleCreatePost = useCallback(
    ({
      title,
      content,
      category,
      tags,
    }: {
      title: string;
      content: string;
      category: string;
      tags: string[];
    }) => {
      const newPost: CommunityPost = {
        id: `p-${Date.now()}`,
        authorId: 'current-user',
        authorName: 'You',
        authorAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=You',
        title,
        content,
        category,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        tags,
      };
      const updated = [newPost, ...localPosts];
      setLocalPosts(updated);
      setCommunityPosts(updated);
      showToast('Post created successfully!');
    },
    [localPosts, setCommunityPosts, showToast]
  );

  // Extract unique categories from existing posts and groups
  const postCategories = Array.from(new Set(localPosts.map((p) => p.category)));
  const groupCategories = Array.from(new Set(localGroups.map((g) => g.category)));

  return (
    <div className="min-h-screen bg-muted/50">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                  <Users className="size-7 text-brand-teal" />
                  Community
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect, share, and explore with fellow StayEg members
                </p>
              </div>
              {isLoggedIn && (
                <Button
                  onClick={() => setCreatePostOpen(true)}
                  className="bg-gradient-to-r from-brand-deep to-brand-teal hover:from-brand-deep/90 hover:to-brand-teal/90 text-white border-0 shadow-md shadow-brand-teal/20 self-start sm:self-auto"
                >
                  <Plus className="size-4 mr-1.5" />
                  Create Post
                </Button>
              )}
            </div>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-5"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search posts, groups, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-muted border-border focus:bg-card transition-colors rounded-xl"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tabs header */}
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-muted/80 p-1 rounded-xl h-auto">
              <TabsTrigger
                value="posts"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-brand-teal"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-brand-teal"
              >
                Groups
              </TabsTrigger>
              <TabsTrigger
                value="my-groups"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-brand-teal"
              >
                My Groups
              </TabsTrigger>
              <TabsTrigger
                value="coming-soon"
                className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-brand-teal"
              >
                ✨ Coming Soon
              </TabsTrigger>
            </TabsList>
            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              {localPosts.length} posts &middot; {localGroups.length} groups
            </div>
          </div>

          {/* ── Posts Tab ─────────────────────────────────── */}
          <TabsContent value="posts">
            {/* Category chips */}
            <div className="mb-4">
              <CategoryChips
                categories={postCategories}
                selected={postCategory}
                onSelect={setPostCategory}
              />
            </div>

            {/* Guest banner */}
            {isGuest && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-brand-sage/10 border border-brand-sage/20 rounded-xl flex items-center gap-3"
              >
                <LogIn className="size-5 text-brand-sage shrink-0" />
                <p className="text-sm text-brand-sage">
                  <span className="font-medium">Login to participate</span> &mdash; like, comment, and
                  create your own posts in the community.
                </p>
              </motion.div>
            )}

            {/* Posts list */}
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} isGuest={isGuest} />
                ))}
              </AnimatePresence>
              {filteredPosts.length === 0 && (
                <EmptyState
                  icon={MessageCircle}
                  title="No posts found"
                  description={
                    searchQuery || postCategory !== 'All'
                      ? 'Try adjusting your search or category filter'
                      : 'Be the first to share something!'
                  }
                />
              )}
            </div>
          </TabsContent>

          {/* ── Groups Tab ────────────────────────────────── */}
          <TabsContent value="groups">
            {/* Category chips */}
            <div className="mb-4">
              <CategoryChips
                categories={groupCategories}
                selected={groupCategory}
                onSelect={setGroupCategory}
              />
            </div>

            {/* Guest banner */}
            {isGuest && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-brand-sage/10 border border-brand-sage/20 rounded-xl flex items-center gap-3"
              >
                <LogIn className="size-5 text-brand-sage shrink-0" />
                <p className="text-sm text-brand-sage">
                  <span className="font-medium">Login to join groups</span> &mdash; connect with
                  people who share your interests.
                </p>
              </motion.div>
            )}

            {/* Groups grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isGuest={isGuest}
                    onToggleJoin={handleToggleJoin}
                  />
                ))}
              </AnimatePresence>
            </div>
            {filteredGroups.length === 0 && (
              <EmptyState
                icon={Users}
                title="No groups found"
                description={
                  searchQuery || groupCategory !== 'All'
                    ? 'Try adjusting your search or category filter'
                    : 'Check back soon for new groups!'
                }
              />
            )}
          </TabsContent>

          {/* ── My Groups Tab ─────────────────────────────── */}
          <TabsContent value="my-groups">
            {isGuest ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-brand-sage/10 border border-brand-sage/20 rounded-xl flex items-center gap-3"
              >
                <LogIn className="size-5 text-brand-sage shrink-0" />
                <p className="text-sm text-brand-sage">
                  <span className="font-medium">Login to view your groups</span> &mdash; join groups
                  to see them here.
                </p>
              </motion.div>
            ) : joinedGroups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No groups joined yet"
                description="Join groups from the Groups tab to connect with like-minded people."
              >
                <button
                  onClick={() => setActiveTab('groups')}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-teal hover:text-foreground transition-colors"
                >
                  Explore groups
                  <ArrowRight className="size-4" />
                </button>
              </EmptyState>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{joinedGroups.length}</span> group
                    {joinedGroups.length !== 1 ? 's' : ''} joined
                  </p>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:text-foreground transition-colors"
                  >
                    Explore more
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {joinedGroups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        isGuest={isGuest}
                        onToggleJoin={handleToggleJoin}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Coming Soon Tab ─────────────────────────── */}
          <TabsContent value="coming-soon">
            <ComingSoonSection />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onSubmit={handleCreatePost}
      />
    </div>
  );
}
