"use client";
import React, { useState } from "react";

import { Grip } from "lucide-react";
import { Reorder, useDragControls, useMotionValue } from "motion/react";

import { useRaisedShadow } from "@/hooks/useRaisedShadow";
import { cn } from "@/lib/utils";

const ReorderList = ({
    className,
    itemClassName,
    withDragHandle = false,
    onReorderFinish,
    children,
    ...props
}) => {
    const [items, setItems] = useState(
        React.Children.toArray(children).filter((child) =>
            React.isValidElement(child),
        )
    );

    React.useEffect(() => {
        setItems(
            React.Children.toArray(children).filter((child) =>
                React.isValidElement(child),
            )
        );
    }, [children]);

    const handleReorderFinish = (newOrder) => {
        setItems(newOrder);
        onReorderFinish?.(newOrder);
    };

    return (
        <Reorder.Group
            data-slot="reorder-list-group"
            axis="y"
            className={cn(
                "flex flex-col gap-1 select-none list-none !p-0 !m-0",
                className,
            )}
            values={items}
            onReorder={handleReorderFinish}
            {...props}
        >
            {items.map((item, index) => (
                <ReorderListItem
                    key={item?.key || index}
                    item={item}
                    withDragHandle={withDragHandle}
                    className={itemClassName}
                />
            ))}
        </Reorder.Group>
    );
};

const ReorderListItem = ({ item, className, withDragHandle = false }) => {
    const y = useMotionValue(0);
    const boxShadow = useRaisedShadow(y);
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            data-slot="reorder-list-item"
            id={item?.key ?? ""}
            value={item}
            className={cn(
                "bg-transparent w-full list-none !p-0 !m-0",
                !withDragHandle ? "cursor-grab" : "",
                className,
            )}
            style={{ boxShadow, y }}
            dragListener={!withDragHandle}
            dragControls={withDragHandle ? dragControls : undefined}
        >
            {withDragHandle ? (
                <div className="relative flex items-center gap-2 w-full">
                    {React.isValidElement(item)
                        ? React.cloneElement(item, {
                              className: cn(
                                  "pr-12 w-full",
                                  item.props.className,
                              ),
                          })
                        : item}
                    <Grip
                        className="size-5 absolute cursor-grab right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onPointerDown={(e) => dragControls.start(e)}
                    />
                </div>
            ) : (
                item
            )}
        </Reorder.Item>
    );
};

export { ReorderList };
