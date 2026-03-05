import React from 'react';

export type LinkAction = 'open' | 'copy';

export interface ExternalLinkButtonProps {
  url: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  action?: LinkAction;
  onSuccess?: (action: LinkAction) => void; // <-- Добавлен аргумент
  onError?: (error: Error, action: LinkAction) => void; // <-- Добавлен аргумент
}

export const ExternalLinkButton: React.FC<ExternalLinkButtonProps> = ({
  url,
  label,
  icon,
  variant = 'primary',
  size = 'md',
  className = '',
  action = 'open',
  onSuccess,
  onError,
}) => {
  const [feedback, setFeedback] = React.useState<'idle' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    // ✅ ИСПРАВЛЕНО: блокируем повторные клики, когда НЕ idle
    if (feedback !== 'idle') return;

    try {
      if (action === 'copy') {
        await navigator.clipboard.writeText(url);
        setFeedback('success');
        onSuccess?.('copy');
      } else {
        // === ОТКРЫТИЕ ===
        if (!url.startsWith('https://') && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
          throw new Error('Only HTTPS and localhost URLs are allowed');
        }

        if (window.electronAPI?.openExternal) {
          await window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        // ✅ Показываем успех и для open
        setFeedback('success');
        onSuccess?.('open');
      }
    } catch (error) {
      console.error(`Failed to ${action} URL:`, error);
      setFeedback('error');
      onError?.(error instanceof Error ? error : new Error(String(error)), action);
    } finally {
      // ✅ Сброс только после того, как состояние установлено
      setTimeout(() => {
        setFeedback('idle');
      }, 1500);
    }
  };

  // === Динамический контент кнопки ===
 const renderContent = () => {
  // Базовые стили для текста: предотвращаем перенос и фиксируем мин. ширину
  const textClass = "inline-block min-w-[250px] text-center transition-opacity duration-200";
  
  if (feedback === 'success') {
    return (
      <>
        <span className="text-green-400 flex-shrink-0">✅</span>
        <span className={textClass}>Скопировано!</span>
      </>
    );
  }
  if (feedback === 'error') {
    return (
      <>
        <span className="text-red-400 flex-shrink-0">❌</span>
        <span className={textClass}>Ошибка</span>
      </>
    );
  }
  // Обычное состояние
  return (
    <>
      <span className="flex-shrink-0">{action === 'copy' ? <span>📋</span> : icon}</span>
      <span className={textClass}>{label}</span>
    </>
  );
};

  // === Стили ===
  const getVariantStyles = () => {
    if (feedback === 'success') return 'bg-green-600 text-white';
    if (feedback === 'error') return 'bg-red-600 text-white';
    
    const variants = {
      primary: 'bg-purple-600 hover:bg-purple-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
      ghost: 'bg-transparent hover:bg-gray-700/50 text-purple-400 hover:text-purple-300',
    };
    return variants[variant];
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={handleClick}
      disabled={feedback !== 'idle'}
      className={`
        ${getVariantStyles()} 
        ${sizes[size]} 
        rounded-lg transition-all duration-200 flex items-center gap-2 font-medium
        disabled:opacity-70 disabled:cursor-wait
        ${className}
      `}
      title={
        feedback !== 'idle' 
          ? (feedback === 'success' ? '✓ Выполнено' : '✗ Ошибка') 
          : (action === 'copy' ? 'Скопировать в буфер обмена' : 'Открыть в браузере')
      }
    >
      {renderContent()}
    </button>
  );
};