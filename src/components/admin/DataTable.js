'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Filter,
} from 'lucide-react';
import styles from './DataTable.module.css';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Search records...',
  filterOptions = [], // e.g. [{ label: 'All Statuses', value: 'ALL' }, ...]
  selectedFilter = 'ALL',
  onFilterChange = () => {},
  bulkActions = [], // [{ label: 'Delete', onClick: (selectedIds) => {}, variant: 'danger' }]
  rowActions = [], // [{ label: 'Edit', onClick: (row) => {}, icon: Icon, href: (row) => ... }]
  emptyMessage = 'No records found',
  emptySubMessage = 'Try adjusting your search or filters.',
  itemsPerPage = 10,
  enableSelection = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeMenuRowId, setActiveMenuRowId] = useState(null);
  const menuRef = useRef(null);

  // Close row action menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuRowId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and search
  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) =>
        columns.some((col) => {
          const val = item[col.accessor];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortField, sortDirection, columns]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSort = (accessor) => {
    if (sortField === accessor) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(accessor);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      const newSelected = new Set(paginatedData.map((row) => row[keyField]));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <div className={styles.wrapper}>
      {/* Top Toolbar */}
      {(searchable || filterOptions.length > 0) && (
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {searchable && (
              <div className={styles.searchInputWrapper}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}

            {filterOptions.length > 0 && (
              <select
                className={styles.filterSelect}
                value={selectedFilter}
                onChange={(e) => {
                  onFilterChange(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.toolbarRight}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Total: <strong>{filteredData.length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Bulk Action Bar if selection active */}
      {enableSelection && selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span>{selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected</span>
          <div className={styles.bulkActions}>
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                className={`btn btn-sm ${action.variant === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => {
                  action.onClick(Array.from(selectedIds));
                  setSelectedIds(new Set());
                }}
              >
                {action.icon && <action.icon size={14} />}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {enableSelection && (
                <th className={styles.checkboxTh}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  className={col.sortable !== false ? styles.sortable : ''}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                  style={{ width: col.width }}
                >
                  <div className={styles.thContent}>
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <span>
                        {sortField === col.accessor ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp size={14} color="var(--color-primary)" />
                          ) : (
                            <ChevronDown size={14} color="var(--color-primary)" />
                          )
                        ) : (
                          <ChevronsUpDown size={14} color="var(--color-gray-400)" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}

              {rowActions.length > 0 && (
                <th className={styles.actionsCell} style={{ width: '60px' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {enableSelection && <td className={styles.checkboxTd}><div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4 }} /></td>}
                  {columns.map((col, cIdx) => (
                    <td key={cIdx}>
                      <div className="skeleton skeleton-text" style={{ width: `${60 + (cIdx * 10) % 40}%` }} />
                    </td>
                  ))}
                  {rowActions.length > 0 && <td className={styles.actionsCell}><div className="skeleton" style={{ width: 24, height: 24, borderRadius: 4, marginLeft: 'auto' }} /></td>}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}>
                  <div className={styles.emptyState}>
                    <Inbox size={40} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>{emptyMessage}</div>
                    <div className={styles.emptyDesc}>{emptySubMessage}</div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const rowId = row[keyField];
                const isSelected = selectedIds.has(rowId);
                const isMenuOpen = activeMenuRowId === rowId;

                return (
                  <tr key={rowId} className={isSelected ? styles.selectedRow : ''}>
                    {enableSelection && (
                      <td className={styles.checkboxTd}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isSelected}
                          onChange={() => toggleSelectRow(rowId)}
                          aria-label={`Select row ${rowId}`}
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td key={col.accessor || col.header}>
                        {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                      </td>
                    ))}

                    {rowActions.length > 0 && (
                      <td className={styles.actionsCell}>
                        <div className={styles.menuContainer} ref={isMenuOpen ? menuRef : null}>
                          <button
                            type="button"
                            className={styles.rowActionBtn}
                            onClick={() => setActiveMenuRowId(isMenuOpen ? null : rowId)}
                            aria-label="Row actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isMenuOpen && (
                            <div className={styles.actionMenu}>
                              {rowActions.map((action, aIdx) => {
                                const Icon = action.icon;
                                const isHidden = typeof action.hidden === 'function' ? action.hidden(row) : action.hidden;
                                if (isHidden) return null;

                                return (
                                  <button
                                    key={aIdx}
                                    type="button"
                                    className={`${styles.menuItem} ${action.variant === 'danger' ? styles.danger : ''}`}
                                    onClick={() => {
                                      setActiveMenuRowId(null);
                                      action.onClick(row);
                                    }}
                                  >
                                    {Icon && <Icon size={14} />}
                                    <span>{action.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && filteredData.length > 0 && (
        <div className={styles.paginationFooter}>
          <div className={styles.paginationInfo}>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredData.length)}</strong> of{' '}
            <strong>{filteredData.length}</strong> results
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Show first, last, and around current page
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 2 ||
                  pageNum === currentPage + 2
                ) {
                  return <span key={pageNum} style={{ padding: '0 4px', color: 'var(--color-text-tertiary)' }}>…</span>;
                }
                return null;
              })}

              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
