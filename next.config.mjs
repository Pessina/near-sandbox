// next.config.mjs
export default {
    pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
    experimental: {
        appDir: true,
    },
    async redirects() {
        return [
            {
                source: '/',
                destination: '/multi-chain',
                permanent: false, // Set to true if you want the redirect to be cached by browsers as permanent
            },
        ];
    },
};
