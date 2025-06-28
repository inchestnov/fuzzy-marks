document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const list = document.getElementById("bookmarkList");

  let allBookmarks = [];
  let filtered = [];
  let currentIndex = 0;

  input.focus();

  chrome.bookmarks.getTree((nodes) => {
    allBookmarks = flattenBookmarks(nodes);
    filtered = [...allBookmarks];
    renderList(filtered, "");
  });

  function flattenBookmarks(nodes) {
    let output = [];
    for (const node of nodes) {
      if (node.url) {
        output.push({ title: node.title, url: node.url });
      }
      if (node.children) {
        output = output.concat(flattenBookmarks(node.children));
      }
    }
    return output;
  }

  function fuzzyMatch(str, query) {
    const s = str.toLowerCase();
    const q = query.toLowerCase();
    let i = 0;
    for (const ch of s) {
      if (ch === q[i]) i++;
      if (i === q.length) break;
    }
    return i === q.length;
  }

  function highlight(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, `<span class="highlight">$1</span>`);
  }

  function getFavicon(url) {
    const u = new URL(chrome.runtime.getURL("/_favicon/"));
    u.searchParams.set("pageUrl", url);
    u.searchParams.set("size", "32");
    return u.toString();
  }

  function renderList(bookmarks, query) {
    list.innerHTML = "";
    bookmarks.forEach((b, i) => {
      const li = document.createElement("li");
      if (i === currentIndex) li.classList.add("selected");

      const img = document.createElement("img");
      img.src = getFavicon(b.url);
      li.appendChild(img);

      const span = document.createElement("span");
      span.innerHTML = highlight(b.title, query);
      li.appendChild(span);

      list.appendChild(li);
    });
  }

  input.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    if (!q) {
      filtered = [...allBookmarks];
    } else {
      filtered = allBookmarks.filter((b) => fuzzyMatch(b.title, q));
    }
    currentIndex = 0;
    renderList(filtered, q);
  });

  document.addEventListener("keydown", (e) => {
    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      currentIndex = (currentIndex + 1) % filtered.length;
      renderList(filtered, input.value);
    } else if (e.key === "ArrowUp") {
      currentIndex = (currentIndex - 1 + filtered.length) % filtered.length;
      renderList(filtered, input.value);
    } else if (e.key === "Enter") {
      const url = filtered[currentIndex].url;
      if (e.ctrlKey || e.metaKey) {
        chrome.tabs.create({ url });
      } else {
        chrome.tabs.update({ url });
      }
      window.close();
    }
  });
});

