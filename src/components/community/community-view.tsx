"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Reply,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface Author {
  id: string;
  name: string;
  role: string;
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  author: Author;
  createdAt: string;
  _count: { comments: number };
}

interface Comment {
  id: string;
  content: string;
  author: Author;
  createdAt: string;
  replies: Comment[];
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  _count: { posts: number };
}

interface Community {
  id: string;
  name: string;
  creatorId: string;
  channels: Channel[];
}

interface CommunityViewProps {
  userId: string;
  isCreator: boolean;
}

export function CommunityView({ userId, isCreator }: CommunityViewProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [postForm, setPostForm] = useState({ title: "", content: "" });
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchCommunities();
  }, []);

  async function fetchCommunities() {
    const res = await fetch("/api/community");
    const data = await res.json();
    setCommunities(data);
    if (data.length > 0 && data[0].channels.length > 0) {
      setSelectedChannel(data[0].channels[0]);
      fetchPosts(data[0].channels[0].id);
    }
    setLoading(false);
  }

  async function fetchPosts(channelId: string) {
    const res = await fetch(`/api/community/channels/${channelId}/posts`);
    setPosts(await res.json());
    setSelectedPost(null);
  }

  async function fetchComments(postId: string) {
    const res = await fetch(`/api/community/posts/${postId}/comments`);
    setComments(await res.json());
  }

  async function createPost() {
    if (!selectedChannel || !postForm.content.trim()) return;
    await fetch(`/api/community/channels/${selectedChannel.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postForm),
    });
    setPostForm({ title: "", content: "" });
    setShowNewPost(false);
    toast.success("Post created!");
    fetchPosts(selectedChannel.id);
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
    toast.success("Post deleted");
    if (selectedChannel) fetchPosts(selectedChannel.id);
    setSelectedPost(null);
  }

  async function addComment(parentId?: string) {
    if (!selectedPost) return;
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    await fetch(`/api/community/posts/${selectedPost.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, parentId }),
    });

    if (parentId) {
      setReplyTo(null);
      setReplyText("");
    } else {
      setCommentText("");
    }
    fetchComments(selectedPost.id);
  }

  async function addChannel() {
    if (!newChannel.name.trim()) return;
    await fetch("/api/community/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChannel),
    });
    setNewChannel({ name: "", description: "" });
    setShowAddChannel(false);
    toast.success("Channel created!");
    fetchCommunities();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  if (communities.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No communities available"
        description={isCreator ? "Your community will be set up automatically." : "Purchase a course to access the community."}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        {communities.map((community) => (
          <div key={community.id} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900">{community.name}</h3>
              {isCreator && (
                <button onClick={() => setShowAddChannel(true)} className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded-md transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {community.channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    fetchPosts(channel.id);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedChannel?.id === channel.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Hash className="h-4 w-4" />
                  {channel.name}
                  <span className="ml-auto text-xs text-gray-400">{channel._count.posts}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-3">
        {selectedPost ? (
          <div>
            <button
              onClick={() => setSelectedPost(null)}
              className="text-sm text-gray-500 hover:text-indigo-600 mb-4 inline-flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors"
            >
              &larr; Back to posts
            </button>

            <Card className="mb-4">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {selectedPost.author.name.charAt(0)}
                      </span>
                      <div>
                        <span className="text-sm font-medium">{selectedPost.author.name}</span>
                        {selectedPost.author.role === "CREATOR" && (
                          <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Creator</span>
                        )}
                        <span className="text-xs text-gray-400 ml-2">
                          {formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {selectedPost.title && <h2 className="text-lg font-semibold mb-2">{selectedPost.title}</h2>}
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
                  </div>
                  {(selectedPost.author.id === userId || isCreator) && (
                    <button onClick={() => deletePost(selectedPost.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                />
                <Button onClick={() => addComment()} disabled={!commentText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                        {comment.author.name.charAt(0)}
                      </span>
                      <span className="text-sm font-medium">{comment.author.name}</span>
                      {comment.author.role === "CREATOR" && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Creator</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    <button
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 mt-2 flex items-center gap-1 px-2 py-1 rounded-md transition-colors w-fit"
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </button>

                    {replyTo === comment.id && (
                      <div className="flex gap-2 mt-2 ml-8">
                        <Input
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addComment(comment.id); } }}
                        />
                        <Button size="sm" onClick={() => addComment(comment.id)}>
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {comment.replies?.map((reply) => (
                      <div key={reply.id} className="ml-8 mt-3 pl-3 border-l-2 border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                            {reply.author.name.charAt(0)}
                          </span>
                          <span className="text-xs font-medium">{reply.author.name}</span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedChannel ? `# ${selectedChannel.name}` : "Select a channel"}
              </h2>
              {selectedChannel && (
                <Button size="sm" onClick={() => setShowNewPost(true)}>
                  <Plus className="h-4 w-4" /> New Post
                </Button>
              )}
            </div>

            {posts.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No posts yet"
                description="Be the first to start a conversation!"
                actionLabel="Create Post"
                onAction={() => setShowNewPost(true)}
              />
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
                    onClick={() => {
                      setSelectedPost(post);
                      fetchComments(post.id);
                    }}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                          {post.author.name.charAt(0)}
                        </span>
                        <span className="text-sm font-medium">{post.author.name}</span>
                        {post.author.role === "CREATOR" && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Creator</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {post.title && <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>}
                      <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <MessageSquare className="h-3 w-3" /> {post._count.comments} comments
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={showNewPost} onClose={() => setShowNewPost(false)} title="New Post">
        <form onSubmit={(e) => { e.preventDefault(); createPost(); }} className="space-y-4">
          <Input
            label="Title (optional)"
            placeholder="Post title"
            value={postForm.title}
            onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
          />
          <Textarea
            label="Content"
            placeholder="What's on your mind?"
            value={postForm.content}
            onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
            rows={4}
            required
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowNewPost(false)}>Cancel</Button>
            <Button type="submit">Post</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showAddChannel} onClose={() => setShowAddChannel(false)} title="Add Channel">
        <form onSubmit={(e) => { e.preventDefault(); addChannel(); }} className="space-y-4">
          <Input
            label="Channel Name"
            placeholder="e.g., Course Discussion"
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="What's this channel for?"
            value={newChannel.description}
            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowAddChannel(false)}>Cancel</Button>
            <Button type="submit">Create Channel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
