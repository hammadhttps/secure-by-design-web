import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { postSchema, sanitizeInput } from '../utils/security';
import DOMPurify from 'dompurify';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { csrfToken } = useAuth();

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    reset 
  } = useForm({
    resolver: zodResolver(postSchema)
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/posts', {
        withCredentials: true
      });

      const postsData = response.data.posts || response.data || [];

      if (!Array.isArray(postsData)) {
        setError('Invalid data format received from server');
        setPosts([]);
        return;
      }

      const sanitizedPosts = postsData.map(post => ({
        ...post,
        title: DOMPurify.sanitize(post.title || ''),
        content: DOMPurify.sanitize(post.content || ''),
        username: post.username ? DOMPurify.sanitize(post.username) : 'Unknown'
      }));

      setPosts(sanitizedPosts);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) setError('You must be logged in to view posts');
      else if (err.response?.status === 403) setError('You do not have permission to view posts');
      else setError('Failed to load posts. Please try again later.');

      setPosts([]);
    }
  };

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');

    try {
      const sanitizedData = {
        title: sanitizeInput(data.title),
        content: sanitizeInput(data.content)
      };

      await axios.post('/api/posts', sanitizedData, {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true
      });

      setSuccess('Post created successfully!');
      reset();
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create post');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-gray-100">

    {/* Create Post Panel */}
    <div className="bg-[#0f0f14]/80 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-8 mb-10">
      <h1 className="text-3xl font-bold mb-6 text-indigo-300">Create Post</h1>
  
      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-600/20 border border-red-500/30 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
  
      {success && (
        <div className="mb-4 rounded-lg bg-green-600/20 border border-green-500/30 p-4">
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}
  
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-200">Title</label>
          <input
            {...register('title')}
            type="text"
            className="w-full px-4 py-3 rounded-lg 
                       bg-white/10 border border-white/10 text-gray-100
                       placeholder-gray-400 focus:ring-4 focus:ring-indigo-600/40
                       focus:border-indigo-400 transition-all"
            placeholder="Enter post title"
          />
          {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>}
        </div>
  
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-200">Content</label>
          <textarea
            {...register('content')}
            rows={4}
            className="w-full px-4 py-3 rounded-lg 
                       bg-white/10 border border-white/10 text-gray-100
                       placeholder-gray-400 focus:ring-4 focus:ring-indigo-600/40
                       focus:border-indigo-400 transition-all"
            placeholder="Write something meaningful..."
          />
          {errors.content && <p className="mt-1 text-sm text-red-400">{errors.content.message}</p>}
          <p className="mt-1 text-xs text-gray-500">HTML tags are blocked for security.</p>
        </div>
  
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700
                     rounded-lg shadow-lg shadow-indigo-900/40 font-semibold text-white 
                     hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800
                     focus:ring-4 focus:ring-indigo-700/40 disabled:opacity-40
                     transition-all"
        >
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  
    {/* Recent Posts */}
    <div className="bg-[#0f0f14]/80 backdrop-blur-xl border border-white/5 shadow-xl rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-6 text-indigo-300">Recent Posts</h2>
  
      {posts.length === 0 ? (
        <p className="text-gray-400">No posts yet. Be the first to post!</p>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <div
              key={post.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg 
                         hover:bg-white/10 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-gray-100">{post.title}</h3>
                <span className="text-sm text-indigo-400">by {post.username}</span>
              </div>
  
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
  
              <div className="mt-3 text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  
  </div>
  

  );
};

export default Posts;
