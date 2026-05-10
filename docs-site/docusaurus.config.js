// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Apistry',
  tagline: 'OpenAPI contracts → running services without writing code',
  favicon: '/images/3dlogo.png',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://www.apistry.net',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'apitapestry', // Usually your GitHub org/user name.
  projectName: 'apistry', // Usually your repo name.

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: undefined,
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: '/images/3dApistry-darkblue.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Apistry',
        logo: {
          alt: 'Apistry Logo',
          src: '/images/3dApistry-darkblue.png',
          srcDark: '/images/3dApistry-white.png',
        },
        items: [
          { to: '/docs/intro', label: 'Docs', position: 'left' },
          { to: '/docs/demos/api-index', label: 'Demos', position: 'left' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Getting Started', to: '/docs/getting-started/quick-start'},
              {label: 'Reference', to: '/docs/reference/reference-overview'},
              {label: 'Validations', to: '/docs/reference/validation-reference'},
            ],
          },
          {
            title: 'More',
            items: [
              {label: 'Demo APIs', href: 'https://api.apistry.net'},
            ],
          },
        ],
        copyright: `Apistry, Copyright © ${new Date().getFullYear()}. All rights reserved.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['yaml', 'bash', 'json'],
      },
    }),
};

export default config;
