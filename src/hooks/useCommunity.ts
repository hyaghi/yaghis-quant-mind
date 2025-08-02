import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  likes: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
}

interface CommunityReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
}

interface CreatePostData {
  title: string;
  content: string;
}

interface CreateReplyData {
  post_id: string;
  content: string;
}

export function useCommunityPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['community-posts'],
    queryFn: async (): Promise<CommunityPost[]> => {
      const { data: posts, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profile data for all users
      if (posts && posts.length > 0) {
        const userIds = [...new Set(posts.map(post => post.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        // Map profiles to posts
        return posts.map(post => ({
          ...post,
          author_name: profiles?.find(p => p.user_id === post.user_id)?.display_name || 'Anonymous',
          author_avatar: profiles?.find(p => p.user_id === post.user_id)?.avatar_url,
        }));
      }

      return posts || [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postData: CreatePostData): Promise<CommunityPost> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('community_posts')
        .insert([
          {
            user_id: user.id,
            title: postData.title,
            content: postData.content,
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      return {
        ...data,
        author_name: profile?.display_name || 'Anonymous',
        author_avatar: profile?.avatar_url,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast({
        title: "Post created successfully!",
        description: "Your discussion has been shared with the community.",
      });
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to create post",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });
}

export function usePostReplies(postId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['post-replies', postId],
    queryFn: async (): Promise<CommunityReply[]> => {
      if (!postId) return [];

      const { data: replies, error } = await supabase
        .from('community_replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profile data for all users
      if (replies && replies.length > 0) {
        const userIds = [...new Set(replies.map(reply => reply.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        // Map profiles to replies
        return replies.map(reply => ({
          ...reply,
          author_name: profiles?.find(p => p.user_id === reply.user_id)?.display_name || 'Anonymous',
          author_avatar: profiles?.find(p => p.user_id === reply.user_id)?.avatar_url,
        }));
      }

      return replies || [];
    },
    enabled: !!user && !!postId,
  });
}

export function useCreateReply() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyData: CreateReplyData): Promise<CommunityReply> => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('community_replies')
        .insert([
          {
            user_id: user.id,
            post_id: replyData.post_id,
            content: replyData.content,
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Get current post reply count and increment it
      const { data: post } = await supabase
        .from('community_posts')
        .select('reply_count')
        .eq('id', replyData.post_id)
        .single();

      if (post) {
        await supabase
          .from('community_posts')
          .update({ reply_count: (post.reply_count || 0) + 1 })
          .eq('id', replyData.post_id);
      }

      return {
        ...data,
        author_name: profile?.display_name || 'Anonymous',
        author_avatar: profile?.avatar_url,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['post-replies', data.post_id] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast({
        title: "Reply posted!",
        description: "Your reply has been added to the discussion.",
      });
    },
    onError: (error) => {
      console.error('Error creating reply:', error);
      toast({
        title: "Failed to post reply",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });
}

export function useLikePost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Get current like count and increment it
      const { data: post } = await supabase
        .from('community_posts')
        .select('likes')
        .eq('id', postId)
        .single();

      if (post) {
        const { error } = await supabase
          .from('community_posts')
          .update({ likes: (post.likes || 0) + 1 })
          .eq('id', postId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast({
        title: "Post liked!",
        description: "Thanks for your engagement!",
      });
    },
    onError: (error) => {
      console.error('Error liking post:', error);
      toast({
        title: "Failed to like post",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });
}

// Set up real-time subscriptions for community posts
export function useCommunityRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('community-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['community-posts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['community-posts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_replies'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['community-posts'] });
          queryClient.invalidateQueries({ queryKey: ['post-replies'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}