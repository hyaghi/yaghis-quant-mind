import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  MessageSquare, 
  Star, 
  TrendingUp, 
  Award, 
  Calendar,
  ThumbsUp,
  Share2,
  BookOpen,
  Lightbulb,
  Target,
  Trophy,
  Heart,
  MessageCircle,
  Send,
  Pin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useCommunityPosts, 
  useCreatePost, 
  useLikePost, 
  useCommunityRealtime 
} from '@/hooks/useCommunity';
import { formatDistanceToNow } from 'date-fns';

// Mock data for community features
const discussions = [
  {
    id: 1,
    title: "What's your take on AMD's recent earnings?",
    author: "Sarah Chen",
    avatar: "/placeholder.svg",
    timestamp: "2 hours ago",
    category: "Stock Discussion",
    replies: 23,
    likes: 45,
    isPinned: true,
    preview: "AMD beat expectations but guidance seems conservative. What are your thoughts on the semiconductor outlook?"
  },
  {
    id: 2,
    title: "Portfolio rebalancing strategy in volatile markets",
    author: "Michael Torres",
    avatar: "/placeholder.svg",
    timestamp: "5 hours ago",
    category: "Strategy",
    replies: 15,
    likes: 32,
    isPinned: false,
    preview: "I've been thinking about adjusting my rebalancing frequency given the current market conditions..."
  },
  {
    id: 3,
    title: "Weekly Market Outlook: Fed Meeting Impact",
    author: "Emma Rodriguez",
    avatar: "/placeholder.svg",
    timestamp: "1 day ago",
    category: "Market Analysis",
    replies: 67,
    likes: 128,
    isPinned: true,
    preview: "Key events to watch this week and their potential impact on our portfolios..."
  }
];

const leaderboard = [
  { rank: 1, name: "Alex Kim", points: 2850, badge: "Portfolio Guru", contributions: 45 },
  { rank: 2, name: "Sarah Chen", points: 2650, badge: "Strategy Expert", contributions: 38 },
  { rank: 3, name: "Michael Torres", points: 2400, badge: "Risk Analyst", contributions: 32 },
  { rank: 4, name: "Emma Rodriguez", points: 2200, badge: "Market Watcher", contributions: 29 },
  { rank: 5, name: "David Park", points: 2100, badge: "Options Pro", contributions: 26 }
];

const events = [
  {
    id: 1,
    title: "Monthly Portfolio Review Session",
    date: "Aug 15, 2025",
    time: "2:00 PM EST",
    attendees: 47,
    type: "Live Session"
  },
  {
    id: 2,
    title: "Q3 Earnings Season Prep Webinar",
    date: "Aug 20, 2025",
    time: "7:00 PM EST",
    attendees: 89,
    type: "Educational"
  },
  {
    id: 3,
    title: "Community Trading Contest",
    date: "Sep 1-30, 2025",
    time: "All Month",
    attendees: 156,
    type: "Competition"
  }
];

export default function Community() {
  const { user } = useAuth();
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
  const [newComment, setNewComment] = useState('');
  
  // Real database operations
  const { data: posts, isLoading: postsLoading } = useCommunityPosts();
  const createPostMutation = useCreatePost();
  const likePostMutation = useLikePost();
  
  // Set up real-time updates
  useCommunityRealtime();

  const handlePostSubmit = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    
    createPostMutation.mutate(
      { title: newPost.title, content: newPost.content },
      {
        onSuccess: () => {
          setNewPost({ title: '', content: '', category: 'General' });
        }
      }
    );
  };

  const handleLikePost = (postId: string) => {
    likePostMutation.mutate(postId);
  };

  const handleCommentSubmit = () => {
    // Handle new comment submission
    console.log('New comment:', newComment);
    setNewComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community</h1>
          <p className="text-muted-foreground">
            Connect with fellow investors, share insights, and learn together
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            1,247 Members
          </Badge>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Discussion
          </Button>
        </div>
      </div>

      <Tabs defaultValue="discussions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Discussions Tab */}
        <TabsContent value="discussions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Discussion Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Create Post Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Start a Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="What's on your mind?"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Share your thoughts, ask questions, or discuss market insights..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <select 
                      className="px-3 py-2 border rounded-md"
                      value={newPost.category}
                      onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    >
                      <option value="General">General</option>
                      <option value="Stock Discussion">Stock Discussion</option>
                      <option value="Strategy">Strategy</option>
                      <option value="Market Analysis">Market Analysis</option>
                      <option value="Education">Education</option>
                    </select>
                    <Button 
                      onClick={handlePostSubmit} 
                      disabled={!newPost.title || !newPost.content || createPostMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {createPostMutation.isPending ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Discussion List */}
              {postsLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading discussions...</p>
                </div>
              ) : posts && posts.length > 0 ? (
                posts.map((post) => (
                  <Card key={post.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={post.author_avatar} />
                              <AvatarFallback>
                                {post.author_name?.[0]?.toUpperCase() || 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{post.author_name || 'Anonymous'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                          <p className="text-muted-foreground line-clamp-3">{post.content}</p>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleLikePost(post.id)}
                            disabled={likePostMutation.isPending}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {post.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {post.reply_count}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <Share2 className="h-4 w-4 mr-1" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No discussions yet. Be the first to start a conversation!</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Community Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Community Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Members</span>
                    <span className="font-medium">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Today</span>
                    <span className="font-medium">89</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discussions</span>
                    <span className="font-medium">2,456</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Points</span>
                    <span className="font-medium text-primary">1,850</span>
                  </div>
                </CardContent>
              </Card>

              {/* Top Contributors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Top Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leaderboard.slice(0, 3).map((user) => (
                    <div key={user.rank} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {user.rank}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.points} points</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{user.badge}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Community Leaderboard
              </CardTitle>
              <CardDescription>
                Top contributors based on helpful posts, discussions, and community engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((user) => (
                  <div key={user.rank} className="flex items-center gap-4 p-4 rounded-lg border">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                      user.rank === 1 ? 'bg-yellow-500' : 
                      user.rank === 2 ? 'bg-gray-400' : 
                      user.rank === 3 ? 'bg-amber-600' : 'bg-muted-foreground'
                    }`}>
                      {user.rank}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.contributions} contributions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{user.points}</p>
                      <Badge variant="outline">{user.badge}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{event.type}</Badge>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {event.date} at {event.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {event.attendees} attending
                    </div>
                    <Button className="w-full mt-4">
                      <Heart className="h-4 w-4 mr-2" />
                      Join Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Educational Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Educational Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">Getting Started Guides</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Portfolio Construction Basics</li>
                    <li>• Risk Management 101</li>
                    <li>• Reading Financial Statements</li>
                    <li>• Market Analysis Fundamentals</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Advanced Topics</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Options Strategies</li>
                    <li>• Quantitative Analysis</li>
                    <li>• Alternative Investments</li>
                    <li>• Tax-Efficient Investing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Community Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Community Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">Our Values</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Respectful dialogue and constructive feedback</li>
                    <li>• Evidence-based discussions</li>
                    <li>• No financial advice, only educational content</li>
                    <li>• Share knowledge and learn from others</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Earning Points</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Creating helpful discussions (+50 points)</li>
                    <li>• Receiving likes on posts (+5 points each)</li>
                    <li>• Helpful comments (+10 points)</li>
                    <li>• Daily engagement (+5 points)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}