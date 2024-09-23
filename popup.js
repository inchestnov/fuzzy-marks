document.addEventListener('DOMContentLoaded', () => {
    let currentIndex = 0;
    let bookmarks = [];
    let filteredBookmarks = [];

    const bookmarkList = document.getElementById('bookmarkList');
    const inputField = document.createElement('input');

    // Create the input field for filtering
    inputField.setAttribute('type', 'text');
    inputField.setAttribute('placeholder', 'Search bookmarks...');
    inputField.style.width = '100%';
    inputField.style.padding = '8px';
    document.body.insertBefore(inputField, bookmarkList);

    // Automatically focus on the input field when the popup opens
    inputField.focus();

    // Fetch the bookmarks and display them
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        bookmarks = getBookmarksFromTree(bookmarkTreeNodes);
        filteredBookmarks = [...bookmarks]; // Initially show all bookmarks
        displayBookmarks(filteredBookmarks, '');
        selectBookmark(currentIndex);
    });

    // Extract all bookmarks from bookmark tree recursively
    function getBookmarksFromTree(tree) {
        let bookmarkArray = [];
        tree.forEach(node => {
            if (node.children) {
                bookmarkArray = bookmarkArray.concat(getBookmarksFromTree(node.children));
            } else if (node.url) {
                bookmarkArray.push({ title: node.title, url: node.url });
            }
        });
        return bookmarkArray;
    }

    // Display the bookmarks in the list with favicons and highlighted matches
    function displayBookmarks(bookmarks, query) {
        bookmarkList.innerHTML = ''; // Clear the list before displaying
        bookmarks.forEach((bookmark, index) => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';

            // Create and add the favicon image
            const favicon = document.createElement('img');
            favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}`;
            favicon.style.width = '16px';
            favicon.style.height = '16px';
            favicon.style.marginRight = '10px';
            li.appendChild(favicon);

            // Highlight the matching part of the title
            const title = document.createElement('span');
            const highlightedTitle = highlightText(bookmark.title, query);
            title.innerHTML = highlightedTitle;
            li.appendChild(title);

            bookmarkList.appendChild(li);
        });
    }

    // Highlight the matching query within the bookmark title
    function highlightText(title, query) {
        if (!query) return title; // If there's no query, return the title as is

        const strLower = title.toLowerCase();
        const queryLower = query.toLowerCase();

        let strIndex = 0;
        let queryIndex = 0;

        let result = ""
        while (strIndex < strLower.length && queryIndex < queryLower.length) {
            if (strLower[strIndex] === queryLower[queryIndex]) {
                result += `<span style="background-color: yellow;">${title[strIndex]}</span>`
                queryIndex++;
            } else {
                result += title[strIndex]
            }
            strIndex++;
        }

        while (strIndex < strLower.length) {
            result += title[strIndex];
            strIndex++;
        }

        // If we've matched all characters of the query, it's a fuzzy match
        return result
    }

    // Highlight the currently selected bookmark
    function selectBookmark(index) {
        const items = bookmarkList.getElementsByTagName('li');
        Array.from(items).forEach((item, idx) => {
            item.classList.toggle('selected', idx === index);
        });
    }

    // Open the selected bookmark either in the current tab or a new tab based on keypress
    function openBookmark(bookmark, ctrlPressed) {
        if (ctrlPressed) {
            // Open in a new tab if Ctrl is pressed
            chrome.tabs.create({ url: bookmark.url });
        } else {
            // Open in the current tab by default
            chrome.tabs.update({ url: bookmark.url });
        }
        window.close();  // Close the popup
    }

    // Fuzzy match algorithm to calculate similarity between two strings
    function fuzzyMatch(str, query) {
        const strLower = str.toLowerCase();
        const queryLower = query.toLowerCase();

        let strIndex = 0;
        let queryIndex = 0;

        while (strIndex < strLower.length && queryIndex < queryLower.length) {
            if (strLower[strIndex] === queryLower[queryIndex]) {
                queryIndex++;
            }
            strIndex++;
        }

        // If we've matched all characters of the query, it's a fuzzy match
        return queryIndex === queryLower.length;
    }

    // Filter bookmarks based on fuzzy search input
    function filterBookmarks(query) {
        if (!query) {
            // If no input, reset to showing all bookmarks
            filteredBookmarks = [...bookmarks];
        } else {
            // Filter bookmarks with fuzzy match
            filteredBookmarks = bookmarks.filter(bookmark => fuzzyMatch(bookmark.title, query));
        }

        currentIndex = 0; // Reset index to the first result
        displayBookmarks(filteredBookmarks, query || ''); // Always pass query to ensure highlights are reset when empty
        selectBookmark(currentIndex);
    }

    // Listen for key presses to navigate and select
    document.addEventListener('keydown', (event) => {
        const items = bookmarkList.getElementsByTagName('li');

        if (event.key === 'ArrowDown') {
            currentIndex = (currentIndex + 1) % filteredBookmarks.length;
            selectBookmark(currentIndex);
        } else if (event.key === 'ArrowUp') {
            currentIndex = (currentIndex - 1 + filteredBookmarks.length) % filteredBookmarks.length;
            selectBookmark(currentIndex);
        } else if (event.key === 'Enter') {
            const ctrlPressed = event.ctrlKey || event.metaKey; // Detect Ctrl (or Command on Mac)
            openBookmark(filteredBookmarks[currentIndex], ctrlPressed);
        }
    });

    // Listen for input changes to filter bookmarks
    inputField.addEventListener('input', (event) => {
        const query = event.target.value;
        filterBookmarks(query);
    });
});
