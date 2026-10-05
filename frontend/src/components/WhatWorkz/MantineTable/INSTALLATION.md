# Mantine Table Installation Guide

## Quick Setup

### 1. Install Required Packages
```bash
npm install mantine-datatable @mantine/core @mantine/hooks @mantine/dates @mantine/notifications @tabler/icons-react
```

### 2. Setup Mantine Provider
Add to your main App component (usually `src/App.tsx` or `src/main.tsx`):

```tsx
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';

function App() {
  return (
    <MantineProvider>
      <Notifications />
      {/* Your existing app content */}
    </MantineProvider>
  );
}
```

### 3. Enable Mantine Table
In `frontend/src/pages/TodoManagement.tsx`:

1. **Uncomment the import:**
   ```tsx
   // Change this:
   // import { MantineTodoTable } from '../components/WhatWorkz/MantineTable'
   
   // To this:
   import { MantineTodoTable } from '../components/WhatWorkz/MantineTable'
   ```

2. **Replace the placeholder with actual component:**
   ```tsx
   // Replace the placeholder div with:
   <MantineTodoTable
     todos={filteredTodos}
     groupBy={groupBy}
     selectedTodos={selectedTodos}
     onSelectTodo={(todoName, selected) => {
       const newSelected = new Set(selectedTodos)
       if (selected) {
         newSelected.add(todoName)
       } else {
         newSelected.delete(todoName)
       }
       setSelectedTodos(newSelected)
     }}
     onUpdateTodo={handleUpdateTodo}
     onCompleteTodo={handleCompleteTodo}
     onCancelTodo={handleCancelTodo}
     onDeleteTodo={handleDeleteTodo}
     onEditTodo={(todo) => {
       setEditModal({
         isOpen: true,
         todo: todo
       })
     }}
     onAssignTodo={(todo) => {
       setAssignModal({
         isOpen: true,
         todo: todo
       })
     }}
     onTodoClick={(todo) => {
       setHistoryPanel({
         isOpen: true,
         doctype: 'ToDo',
         docname: todo.name,
         title: todo.subject
       })
     }}
     searchTerm={searchTerm}
     onSearchChange={setSearchTerm}
   />
   ```

### 4. Test the Toggle
- Click the "Table: Custom" toggle in the header
- It should switch to "Table: Mantine" and show the beautiful new table!

## Features You'll Get

✅ **Modern Design** - Beautiful Mantine styling
✅ **Advanced Sorting** - Multi-column sorting with indicators
✅ **Rich Filtering** - Dropdown filters for status, priority, assignee
✅ **Pagination** - Built-in pagination with page size options
✅ **Row Selection** - Multi-select with checkboxes
✅ **Export Ready** - CSV/Excel export capabilities
✅ **Responsive** - Mobile-optimized layouts
✅ **Accessibility** - Full keyboard navigation
✅ **Performance** - Optimized for large datasets

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors, make sure all packages are installed:
```bash
npm install --save-dev @types/react @types/react-dom
```

### Styling Issues
Make sure all CSS imports are added to your main App component:
```tsx
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
```

### Import Errors
Ensure the MantineProvider wraps your entire app:
```tsx
<MantineProvider>
  <Notifications />
  {/* All your app content here */}
</MantineProvider>
```

## Rollback Instructions

If you want to go back to the custom table:
1. Click the toggle to switch back to "Custom"
2. Or comment out the Mantine import again
3. Or uninstall the packages: `npm uninstall mantine-datatable @mantine/core @mantine/hooks @mantine/dates @mantine/notifications @tabler/icons-react`

## Support

The Mantine table is a drop-in replacement with the same interface as your custom table. All existing functionality will work exactly the same, but with a much more modern and feature-rich experience!
