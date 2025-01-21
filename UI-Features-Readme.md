# UI Features Overview

This document outlines the various UI features available in the AI Customer Support Agent application, specifically focusing on the sidebar configurations.

## Feature Toggles

The application allows toggling the visibility of the left and right sidebars through the following scripts:

### 1. Full UI (Default)
- **Command**: `npm run dev` or `npm run build`
- **Description**: Both left and right sidebars are included.

![Full Chat UI](images/both-sidebars-a.png)

```mermaid
graph TD
    A[User Interface] --> B[Left Sidebar]
    A --> C[Right Sidebar]
    B --> D[Content Area]
    C --> D
```

### 2. Left Sidebar Only
- **Command**: `npm run dev:left` or `npm run build:left`
- **Description**: Only the left sidebar is included.

![Left Sidebar Only](images/left-sidebar-a.png)
![Left Sidebar Only](images/left-sidebar-b.png)

```mermaid
graph TD
    A[User Interface] --> B[Left Sidebar]
    B --> C[Content Area]
```

### 3. Right Sidebar Only
- **Command**: `npm run dev:right` or `npm run build:right`
- **Description**: Only the right sidebar is included.

![Right Sidebar Only](images/right-sidebar-a.png)
![Right Sidebar Only](images/right-sidebar-b.png)

```mermaid
graph TD
    A[User Interface] --> B[Right Sidebar]
    B --> C[Content Area]
```

### 4. No Sidebars (Chat Mode)
- **Command**: `npm run dev:chat` or `npm run build:chat`
- **Description**: Both sidebars are excluded.

![Full Chat UI](images/full-ui-a.png)
![Full Chat UI - Hello](images/full-ui-b.png)

```mermaid
graph TD
    A[User Interface] --> B[Content Area]
```

## Conclusion

These feature toggles provide flexibility in the UI layout, allowing developers to customize the user experience based on their needs.
