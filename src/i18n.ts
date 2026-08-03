export type Lang = 'en' | 'tr';

export interface Dict {
  nav: { posts: string; tags: string; about: string };
  hero: { hello: string; bio: string };
  sections: { latest: string; archive: string };
  home: { allPosts: string };
  blog: {
    title: string;
    all: string;
    description: string;
    back: string;
    otherLang: string;
  };
  tags: { title: string; description: string; back: string; empty: string };
  about: { title: string; description: string; p1: string; p2: string; contact: string };
  footer: { copyright: string };
  meta: { defaultDescription: string };
  rss: { description: string };
}

export const i18n: Record<Lang, Dict> = {
  en: {
    nav: { posts: 'posts', tags: 'tags', about: 'about' },
    hero: {
      hello: '// hi, I am',
      bio: 'Cybersecurity learner documenting my journey through digital threats, security concepts, and real world cases. Bug bounty, CTF write-ups, vulnerability research and everything in between.',
    },
    sections: { latest: 'latest posts', archive: 'archive' },
    home: { allPosts: 'all posts →' },
    blog: {
      title: 'Posts',
      all: 'All posts',
      description: 'All posts — write-ups, analyses and journey notes.',
      back: '← all posts',
      otherLang: 'Türkçe oku',
    },
    tags: {
      title: 'Tags',
      description: 'Posts grouped by tag.',
      back: '← all tags',
      empty: 'No tags yet.',
    },
    about: {
      title: 'About',
      description: 'About Enes Bayraker — ethersec.',
      p1: "Hi, I'm Enes Bayraker — I write under the name ethersec. I'm a researcher learning cybersecurity, documenting my journey through the bug bounty and CTF world. Here I share what I learn, the challenges I solve and my analyses.",
      p2: 'All of my writing is for educational purposes and security awareness.',
      contact: 'You can reach me here:',
    },
    footer: { copyright: 'Enes Bayraker · ethersec' },
    meta: { defaultDescription: 'Security notes, write-ups and my bug bounty journey.' },
    rss: {
      description:
        'Cybersecurity learner documenting my journey through digital threats, security concepts, and real world cases.',
    },
  },
  tr: {
    nav: { posts: 'yazılar', tags: 'etiketler', about: 'hakkımda' },
    hero: {
      hello: '// merhaba, ben',
      bio: 'Siber güvenlik öğrenen ve dijital tehditler, güvenlik kavramları ile gerçek dünya vakaları üzerinden yolculuğunu belgeleyen bir araştırmacıyım. Bug bounty, CTF yazıları, zafiyet araştırması ve aradaki her şey.',
    },
    sections: { latest: 'son yazılar', archive: 'arşiv' },
    home: { allPosts: 'tüm yazılar →' },
    blog: {
      title: 'Yazılar',
      all: 'Tüm yazılar',
      description: "Tüm yazılar — write-up'lar, analizler ve yolculuk notları.",
      back: '← tüm yazılar',
      otherLang: 'Read in English',
    },
    tags: {
      title: 'Etiketler',
      description: 'Yazıların etiketlere göre sınıflandırması.',
      back: '← tüm etiketler',
      empty: 'Henüz etiket yok.',
    },
    about: {
      title: 'Hakkımda',
      description: 'Enes Bayraker hakkında — ethersec.',
      p1: 'Merhaba, ben Enes Bayraker — yazarlık adıyla ethersec. Siber güvenlik öğrenen, bug bounty ve CTF dünyasında yolculuğunu belgeleyen bir araştırmacıyım. Burada öğrendiklerimi, çözdüğüm soruları ve analizlerimi paylaşıyorum.',
      p2: 'Yazılarımın tamamı eğitim ve güvenlik farkındalığı amaçlıdır.',
      contact: 'Bana buradan ulaşabilirsin:',
    },
    footer: { copyright: 'Enes Bayraker · ethersec' },
    meta: { defaultDescription: 'Güvenlik notları, yazılar ve bug bounty yolculuğum.' },
    rss: {
      description:
        'Siber güvenlik öğrenen, dijital tehditler, güvenlik kavramları ve gerçek dünya vakaları üzerinden yolculuğunu belgeleyen biri.',
    },
  },
};

export function getDict(lang: Lang): Dict {
  return i18n[lang];
}
