/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jira-blue': '#0052CC',
        'jira-blue-light': '#0065FF',
        'jira-gray': '#42526E',
        'jira-bg': '#F4F5F7',
      },
    },
  },
  plugins: [],
}
