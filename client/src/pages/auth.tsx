import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import {
  registerSchema,
  loginSchema,
  passwordSchema,
  emailSchema,
} from '../../../shared/validation';
import { api, json } from '../services/api';
import { Logo, Field, CheckItem } from '../components/common';
import { Button } from '../components/ui/button';
import type { User } from '../types';
export default function AuthPage({
  mode,
}: {
  mode: 'login' | 'register' | 'forgot' | 'reset' | 'verify';
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const token = params.get('token');
  const schema =
    mode === 'register'
      ? registerSchema
      : mode === 'login'
        ? loginSchema
        : mode === 'forgot'
          ? z.object({ email: emailSchema })
          : mode === 'reset'
            ? z
                .object({ password: passwordSchema, confirmPassword: z.string() })
                .refine((v) => v.password === v.confirmPassword, {
                  path: ['confirmPassword'],
                  message: 'Passwords do not match',
                })
            : z.object({});
  type Fields = { name?: string; email?: string; password?: string; confirmPassword?: string };
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (data: Fields) =>
      api<User>(
        `/auth/${{ login: 'login', register: 'register', forgot: 'forgot-password', reset: 'reset-password', verify: 'verify-email' }[mode]}`,
        json('POST', { ...data, ...(token && { token }) }),
      ),
    onSuccess: (user) => {
      if (mode === 'login' || mode === 'register') {
        client.clear();
        client.setQueryData(['user'], user);
        const next = params.get('next');
        navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/app');
      } else {
        setDone(true);
        void client.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });
  const title = {
    login: 'Welcome back.',
    register: 'Great work starts here.',
    forgot: 'Forgot your password?',
    reset: 'A fresh start.',
    verify: 'Verify your email.',
  }[mode];
  const subtitle = {
    login: 'Your team, your projects, your next big thing.',
    register: 'Create your account. Bring your ideas to life.',
    forgot: 'We’ll send you a secure link to reset it.',
    reset: 'Choose a new password for your account.',
    verify: 'One last step to make your account yours.',
  }[mode];
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Logo />
        <div className="auth-story">
          <span className="eyebrow">LESS FRICTION. MORE FLOW.</span>
          <h1>
            A little structure.
            <br />A lot of possibility.
          </h1>
          <p>
            Make room for the work that matters. Your projects, people, and progress — finally in
            one place.
          </p>
          <div className="auth-visual">
            <div className="floating-note note-one">
              <span className="status-dot done" /> Website redesign <CheckCircle2 size={18} />
            </div>
            <div className="floating-note note-two">
              <span className="status-dot in_progress" /> Your next big idea{' '}
              <span className="tiny-badge">In progress</span>
            </div>
            <div className="floating-note note-three">
              <span className="status-dot todo" /> A more focused team <span>✦</span>
            </div>
          </div>
          <div className="auth-benefits">
            <CheckItem>Built for collaboration</CheckItem>
            <CheckItem>Clarity from day one</CheckItem>
          </div>
        </div>
        <p className="auth-copyright">© {new Date().getFullYear()} TaskFlow. Make work flow.</p>
      </aside>
      <main className="auth-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="auth-form">
          <div className="mobile-logo">
            <Logo />
          </div>
          {done ? (
            <div className="auth-success">
              <CheckCircle2 size={46} />
              <h1>
                {mode === 'forgot'
                  ? 'Check your inbox.'
                  : mode === 'verify'
                    ? 'You’re verified.'
                    : 'Password updated.'}
              </h1>
              <p>
                {mode === 'forgot'
                  ? 'If an account exists for that email, a reset link is on its way. Check your spam folder too.'
                  : 'You’re all set. Head back to your workspace.'}
              </p>
              <Button asChild>
                <Link to={mode === 'verify' ? '/app' : '/login'}>
                  Continue <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <h1>{title}</h1>
              <p className="auth-subtitle">{subtitle}</p>
              <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate>
                {mode === 'register' && (
                  <Field label="Full name" error={errors.name?.message}>
                    <input autoComplete="name" placeholder="Alex Morgan" {...register('name')} />
                  </Field>
                )}
                {['login', 'register', 'forgot'].includes(mode) && (
                  <Field label="Email address" error={errors.email?.message}>
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      {...register('email')}
                    />
                  </Field>
                )}
                {['login', 'register', 'reset'].includes(mode) && (
                  <Field label="Password" error={errors.password?.message}>
                    <span className="password-input">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder={
                          mode === 'login' ? 'Enter your password' : 'At least 10 characters'
                        }
                        {...register('password')}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </span>
                  </Field>
                )}
                {['register', 'reset'].includes(mode) && (
                  <Field label="Confirm password" error={errors.confirmPassword?.message}>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      {...register('confirmPassword')}
                    />
                  </Field>
                )}
                {mode === 'login' && (
                  <div className="auth-forgot">
                    <span>
                      <ShieldCheck size={14} /> Secure sign in
                    </span>
                    <Link to="/forgot-password">Forgot password?</Link>
                  </div>
                )}
                {mode === 'verify' && !token && (
                  <p className="notice">
                    Open the verification link in your email, or request a new one from your
                    profile.
                  </p>
                )}
                {mutation.error && (
                  <p className="form-error" role="alert">
                    {mutation.error.message}
                  </p>
                )}
                <Button
                  className="w-full"
                  disabled={mutation.isPending || (['reset', 'verify'].includes(mode) && !token)}
                >
                  {mutation.isPending
                    ? 'Please wait…'
                    : {
                        login: 'Sign in',
                        register: 'Create account',
                        forgot: 'Send reset link',
                        reset: 'Reset password',
                        verify: 'Verify email',
                      }[mode]}
                  <ArrowRight size={17} />
                </Button>
              </form>
              {mode === 'register' && (
                <p className="auth-terms">
                  By creating an account, you agree to our <Link to="/terms">Terms</Link> and{' '}
                  <Link to="/privacy">Privacy Policy</Link>.
                </p>
              )}
              <p className="auth-switch">
                {mode === 'login'
                  ? 'New to TaskFlow?'
                  : mode === 'register'
                    ? 'Already have an account?'
                    : 'Remember your password?'}{' '}
                <Link to={mode === 'login' ? '/register' : '/login'}>
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </Link>
              </p>
            </>
          )}
        </div>
        <div className="auth-footer">
          <ShieldCheck size={14} /> Your next great project is one sign in away.
        </div>
      </main>
    </div>
  );
}
