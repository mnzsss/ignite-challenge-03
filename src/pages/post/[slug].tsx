import { GetStaticPaths, GetStaticProps } from 'next';
import { Fragment } from 'react';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).length;
}

export default function Post({ post }: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  if (isFallback) {
    return <span>Carregando...</span>;
  }

  const minutesToRead = post.data.content.reduce((acc, content) => {
    let newAcc = acc;

    newAcc += countWords(content.heading) / 200;
    newAcc += countWords(RichText.asText(content.body)) / 200;

    return Math.ceil(newAcc);
  }, 0);

  return (
    <>
      <Head>
        <title>spacetraveling - {post.data.title}</title>
      </Head>
      <Header />
      <main className={styles.container}>
        <img src={post.data.banner.url} alt={post.data.title} />
        <article className={commonStyles.container}>
          <h1>{post.data.title}</h1>
          <div className={styles.data}>
            <time>
              <FiCalendar size={24} />
              {format(new Date(post.first_publication_date), 'dd MMM u', {
                locale: ptBR,
              })}
            </time>
            <div className={styles.author}>
              <FiUser size={24} />
              {post.data.author}
            </div>
            <div className={styles.readTime}>
              <FiClock size={24} />
              {minutesToRead} min
            </div>
          </div>
          <div className={styles.content}>
            {post.data.content.map(content => (
              <Fragment key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </Fragment>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.banner', 'posts.author', 'posts.content'],
    }
  );

  const paths = posts.results.map(result => ({
    params: {
      slug: result.uid,
    },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
      subtitle: response.data.subtitle,
    },
    uid: response.uid,
  };

  return {
    props: {
      post,
    },
    revalidate: 60, // 1 minuto
  };
};
