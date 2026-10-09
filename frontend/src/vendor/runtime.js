// Compatibility exports for names recovered from the deployed module graph.
// Libraries are regular npm dependencies, so new code shares the same React.
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import * as ReactDOMCore from 'react-dom';
import * as jsxRuntime from 'react/jsx-runtime';
import axios from 'axios';
import { create as createStore } from 'zustand';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// The recovered symbol is NavLink: its children/className are render functions.
import { BrowserRouter, Route, Routes, Outlet, NavLink as Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import {
  createLucideIcon as createIcon,
  ArrowLeft as IconArrowLeft, CalendarDays as IconCalendarDays,
  Camera as IconCamera, ChevronRight as IconChevronRight,
  CirclePlus as IconCirclePlus, Heart as IconHeart, House as IconHouse,
  LoaderCircle as IconLoaderCircle, MapPin as IconMapPin, Menu as IconMenu,
  Pencil as IconPencil, Plus as IconPlus, Search as IconSearch,
  Settings as IconSettings, Shuffle as IconShuffle, Star as IconStar,
  Store as IconStore, Trash2 as IconTrash2, Trophy as IconTrophy,
  UtensilsCrossed as IconUtensilsCrossed, X as IconX,
} from 'lucide-react';

gsap.registerPlugin(useGSAP, Flip, ScrollToPlugin);
gsap.defaults({ duration: 0.3, ease: 'power2.out', overwrite: 'auto' });

export function A(target, ...sources) {
  sources.forEach((source, index) => {
    source ??= {};
    if (index % 2 === 1) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      for (const key of Reflect.ownKeys(Object(source))) {
        if (Object.prototype.propertyIsEnumerable.call(source, key)) {
          Object.defineProperty(target, key, { value: source[key], enumerable: true, configurable: true, writable: true });
        }
      }
    }
  });
  return target;
}
export function ee(object, excluded) {
  if (object == null) return {};
  const result = {};
  for (const key of Reflect.ownKeys(Object(object))) {
    if (!excluded.includes(key) && Object.prototype.propertyIsEnumerable.call(object, key)) {
      Object.defineProperty(result, key, { value: object[key], enumerable: true, configurable: true, writable: true });
    }
  }
  return result;
}
export function interopModule(value) {
  if (value?.__esModule) return value;
  return Object.assign(Object.create(null), value, { default: value });
}
export function initHelpers() {}
export const getReact = () => React;
export const getJSXRuntime = () => jsxRuntime;
export const getReactDOMCore = () => ReactDOMCore;
export const __vite__mapDeps = () => [];
export const re = (loader) => loader();

export {
  React, ReactDOM, ReactDOMCore, jsxRuntime, axios, createStore, toast, Toaster,
  QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient,
  BrowserRouter, Route, Routes, Outlet, Link, useNavigate, useLocation,
  useParams, useSearchParams, useGSAP, gsap, createIcon,
  IconArrowLeft, IconCalendarDays, IconCamera, IconChevronRight, IconCirclePlus,
  IconHeart, IconHouse, IconLoaderCircle, IconMapPin, IconMenu, IconPencil,
  IconPlus, IconSearch, IconSettings, IconShuffle, IconStar, IconStore,
  IconTrash2, IconTrophy, IconUtensilsCrossed, IconX,
};
