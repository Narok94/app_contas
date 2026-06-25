import React, { useState } from 'react';
import { type User } from '../types';

interface ChangePasswordModalProps {
  user: User;
  onSubmit: (userId: string, newPassword: string) => void;
  onLogout: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onSubmit, onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 3) {
      setError('A senha deve ter pelo menos 3 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    onSubmit(user.id, newPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-dark-background p-4 animate-fade-in">
      <div className="w-full max-w-md p-6 sm:p-8 space-y-6 bg-surface dark:bg-dark-surface rounded-2xl shadow-xl ring-1 ring-black/5">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-dark-text-primary">Alterar Senha</h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
            Olá, <span className="font-semibold">{user.name}</span>. Por segurança, você precisa criar uma nova senha.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="new-password" className="sr-only">Nova Senha</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              required
              className="w-full px-3 py-2.5 bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nova Senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="sr-only">Confirmar Senha</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              className="w-full px-3 py-2.5 bg-surface-light dark:bg-dark-surface-light border border-border-color dark:border-dark-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Confirmar Nova Senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-center text-danger animate-fade-in">{error}</p>}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
            >
              Salvar Nova Senha
            </button>
          </div>
        </form>
        <div className="text-center">
            <button onClick={onLogout} className="text-sm text-text-muted dark:text-dark-text-muted hover:underline">
                Sair
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
