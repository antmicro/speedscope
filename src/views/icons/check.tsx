/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */


interface CheckIconProps {
  color?: string,
  size?: string,
}


export default function CheckIcon({color = "#D5D5D5", size = "16"}: CheckIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.3333 4L5.99996 11.3333L2.66663 8" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  );
}
