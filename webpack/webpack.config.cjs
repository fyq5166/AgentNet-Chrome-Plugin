//credit to https://betterprogramming.pub/creating-chrome-extensions-with-typescript-914873467b65

const path = require('path');

const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');


const root = path.resolve(__dirname, "..");
const pathsToClean = [path.resolve(root, 'htmlsniffer')];
module.exports = {
    mode: "development",
    context: root,
    entry: {
        background: path.resolve(root, "src", "background.ts"),
        page_data_collection: path.resolve(root, "src", "content.ts")
    },
    devtool: "source-map",
    output: {
        path: path.join(root, "htmlsniffer", "src"),
        filename: "[name].js",
        clean: true
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: [path.resolve(root, 'node_modules'), path.resolve(root, 'tests')]
            }
        ],
    },
    plugins: [
        new CleanWebpackPlugin({cleanOnceBeforeBuildPatterns: pathsToClean}),
        new CopyPlugin({
            patterns: [
                {from: path.resolve(root, "manifest.json"), to: path.resolve(root, "htmlsniffer")},
                {from: "icons", to: path.resolve(root, "htmlsniffer", "icons"), context: root}
            ]
        })
    ]
};