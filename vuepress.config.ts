import {defineUserConfig} from 'vuepress'
import {hopeTheme} from "vuepress-theme-hope";
import viteBundler from "@vuepress/bundler-vite";
import {googleAnalyticsPlugin} from '@vuepress/plugin-google-analytics';
import {socialSharePlugin} from 'vuepress-plugin-social-share'

const searchPluginOption = {
    getExtraFields: (page) => [
        ...(page.frontmatter.category ? [page.frontmatter.category] : []),
        ...(page.frontmatter.tag ? [page.frontmatter.tag] : []),
    ],
}

const extendsNetworks: any = {
    pinterest: {
        sharer: 'https://pinterest.com/pin/create/button/?url=@url&media=@media&description=@title',
        type: 'popup',
        icon: '/pinterest.png',
    },
    vk: {
        sharer:
            'https://vk.com/share.php?url=@url&title=@title&image=@media',
        type: 'popup',
        icon: '<!-- icon666.com - MILLIONS vector ICONS FREE --><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path style="fill:#436EAB;" d="M440.649,295.361c16.984,16.582,34.909,32.182,50.142,50.436 c6.729,8.112,13.099,16.482,17.973,25.896c6.906,13.382,0.651,28.108-11.348,28.907l-74.59-0.034 c-19.238,1.596-34.585-6.148-47.489-19.302c-10.327-10.519-19.891-21.714-29.821-32.588c-4.071-4.444-8.332-8.626-13.422-11.932 c-10.182-6.609-19.021-4.586-24.84,6.034c-5.926,10.802-7.271,22.762-7.853,34.8c-0.799,17.564-6.108,22.182-23.751,22.986 c-37.705,1.778-73.489-3.926-106.732-22.947c-29.308-16.768-52.034-40.441-71.816-67.24 C58.589,258.194,29.094,200.852,2.586,141.904c-5.967-13.281-1.603-20.41,13.051-20.663c24.333-0.473,48.663-0.439,73.025-0.034 c9.89,0.145,16.437,5.817,20.256,15.16c13.165,32.371,29.274,63.169,49.494,91.716c5.385,7.6,10.876,15.201,18.694,20.55 c8.65,5.923,15.236,3.96,19.305-5.676c2.582-6.11,3.713-12.691,4.295-19.234c1.928-22.513,2.182-44.988-1.199-67.422 c-2.076-14.001-9.962-23.065-23.933-25.714c-7.129-1.351-6.068-4.004-2.616-8.073c5.995-7.018,11.634-11.387,22.875-11.387h84.298 c13.271,2.619,16.218,8.581,18.035,21.934l0.072,93.637c-0.145,5.169,2.582,20.51,11.893,23.931 c7.452,2.436,12.364-3.526,16.836-8.251c20.183-21.421,34.588-46.737,47.457-72.951c5.711-11.527,10.622-23.497,15.381-35.458 c3.526-8.875,9.059-13.242,19.056-13.049l81.132,0.072c2.406,0,4.84,0.035,7.17,0.434c13.671,2.33,17.418,8.211,13.195,21.561 c-6.653,20.945-19.598,38.4-32.255,55.935c-13.53,18.721-28.001,36.802-41.418,55.634 C424.357,271.756,425.336,280.424,440.649,295.361L440.649,295.361z"/></svg>',
    },
}

export default defineUserConfig({
    lang: 'ru-RU',
    title: 'SEO Рецепты',
    description: 'Различные рецепты, советы, инструкции по сео и настройки сайтов',
    shouldPrefetch: false,
    head: [
        ['script', {}, `
            <!-- /Yandex.Metrika counter -->
            (function (m, e, t, r, i, k, a) {
                m[i] = m[i] || function () {
                    (m[i].a = m[i].a || []).push(arguments)
                };
                m[i].l = 1 * new Date();
                for (var j = 0; j < document.scripts.length; j++) {
                    if (document.scripts[j].src === r) {
                        return;
                    }
                }
                k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(k, a)
            })
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            
            ym(90252793, "init", {
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true, webvisor: true
            });
            <!-- /Yandex.Metrika counter -->
        `],
    ],
    theme: hopeTheme({
        logo: 'https://vuejs.press/images/hero.png',
        docsRepo: 'https://github.com/Ichinya/seo_recipes',
        docsBranch: 'main',
        docsDir: 'docs',
        lastUpdated: true,
        contributors: true,
        navbar: [
            '/info/',
            '/cookbook/',
            {text: 'Список тегов', link: '/tag/', icon: 'fa-solid fa-tags'},
            {text: 'Список категорий', link: '/category/', icon: 'fa-solid fa-folder-tree'},
            {text: 'Таймлайн', link: '/timeline/', icon: 'fa-solid fa-timeline'},
            {text: 'Блог', link: 'https://ichiblog.ru'}
        ],
        sidebar: {
            '/cookbook/': "structure",
            '/info/': "structure",
            '/': [""],
        },
        sidebarSorter: ["readme", "order", "title"],
        footer: `<!-- Yandex.Metrika counter --><noscript><div><img src="https://mc.yandex.ru/watch/90252793" style="position:absolute; left:-9999px;" alt="" /></div></noscript><!-- /Yandex.Metrika counter -->`,
        copyright: '',
        displayFooter: true,
        pageInfo: [
            "Author", "PageView", "Date", "Category", "Tag", "ReadingTime", "Word"
        ],
        author: {name: 'Ичи', url: 'https://ichiblog.ru'},
        plugins: {
            blog: true,
            git: {
                createdTime: true,
                updatedTime: true,
                contributors: true,
            },
            components: {components: ["VidStack", "SiteInfo"]},
            comment: {
                provider: 'Giscus',
                repoId: 'R_kgDOGHxn6A',
                category: 'Комментарии',
                categoryId: 'DIC_kwDOGHxn6M4CiifV',
                repo: 'Ichinya/seo_recipes',
                mapping: 'title',
                strict: false,
                reactionsEnabled: true,
                inputPosition: 'top',
            },
            pwa: {
                showInstall: true,
                manifest: {
                    name: 'SEO Рецепты',
                    lang: 'ru-RU',
                },
                update: 'hint',
                favicon: '/favicon.ico',
            },
            search: searchPluginOption,
            sitemap: {
                hostname: 'https://seo-recipes.ru/',
            } as any,
        },
        markdown: {
            highlighter: {
                type: 'prismjs',
                themes: {
                    light: 'ghcolors',
                    dark: 'atom-dark',
                },
                lineNumbers: true,
                highlightLines: true,
            },
        },
    }),
    locales: {
        "/": {
            lang: "ru-RU",
            title: "SEO Рецепты",
            description: "Различные рецепты, советы, инструкции по сео и настройки сайтов.",
        }
    },
    public: `./public`,
    plugins: [
        // sitemapPlugin({hostname: 'https://seo-recipes.ru/'}),
        googleAnalyticsPlugin({
            id: 'G-YFXPYL3Y6H',
        }),
        socialSharePlugin({
            networks: ['vk', 'telegram'],
            autoQuote: true,
            isPlain: false,
            extendsNetworks,
        }),
    ],
    bundler: viteBundler(),
})
