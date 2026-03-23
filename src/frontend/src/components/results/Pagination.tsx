import { Component, For, Show } from 'solid-js';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: Component<PaginationProps> = (props) => {
  const pages = () => {
    const total = props.totalPages;
    const current = props.currentPage;
    const items: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) items.push(i);
    } else {
      items.push(1);
      if (current > 3) items.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        items.push(i);
      }
      if (current < total - 2) items.push('...');
      items.push(total);
    }
    return items;
  };

  return (
    <div class={styles.container}>
      <button
        class={styles.button}
        disabled={props.currentPage <= 1}
        onClick={() => props.onPageChange(props.currentPage - 1)}
      >
        Previous
      </button>
      <div class={styles.pages}>
        <For each={pages()}>
          {(page) => (
            <Show
              when={page !== '...'}
              fallback={<span class={styles.ellipsis}>...</span>}
            >
              <button
                class={`${styles.pageButton} ${props.currentPage === page ? styles.active : ''}`}
                onClick={() => props.onPageChange(page as number)}
              >
                {page}
              </button>
            </Show>
          )}
        </For>
      </div>
      <button
        class={styles.button}
        disabled={props.currentPage >= props.totalPages}
        onClick={() => props.onPageChange(props.currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
